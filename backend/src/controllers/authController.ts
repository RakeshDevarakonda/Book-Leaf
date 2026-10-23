import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { loginSchema, signupSchema } from '../validators/authValidators';
import { env } from '../config/env';
import { COOKIE_NAMES, COOKIE_PATHS, ERROR_CODES, HTTP_STATUS, TOKEN_EXPIRY } from '../config/constants';

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: TOKEN_EXPIRY.ACCESS_TOKEN_SECONDS * 1000, // maxAge takes ms
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: COOKIE_PATHS.REFRESH_TOKEN,
  maxAge: TOKEN_EXPIRY.REFRESH_TOKEN_SECONDS * 1000, // maxAge takes ms
};

export const authController = {
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, accessToken, refreshToken } = await authService.signup(req.body);

      res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, ACCESS_COOKIE_OPTIONS);
      res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, REFRESH_COOKIE_OPTIONS);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: {
          user,
          accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const { user, accessToken, refreshToken } = await authService.login(email, password);

      res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, ACCESS_COOKIE_OPTIONS);
      res.cookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, REFRESH_COOKIE_OPTIONS);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          user,
          accessToken,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] || req.body?.refreshToken;
      
      const { accessToken, refreshToken: newRefreshToken, user } = await authService.refresh(refreshToken);

      // Always update access token cookie
      res.cookie(COOKIE_NAMES.ACCESS_TOKEN, accessToken, ACCESS_COOKIE_OPTIONS);

      // Only update refresh token cookie if it was actually rotated
      if (newRefreshToken) {
        res.cookie(COOKIE_NAMES.REFRESH_TOKEN, newRefreshToken, REFRESH_COOKIE_OPTIONS);
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          user,
          accessToken,
        },
      });
    } catch (err) {
      // Clear cookies on refresh failure so dead tokens are removed
      res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, ACCESS_COOKIE_OPTIONS);
      res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, REFRESH_COOKIE_OPTIONS);
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: { code: ERROR_CODES.UNAUTHORIZED, message: 'Not authenticated' },
        });
        return;
      }

      const user = await authService.getProfile(req.user.id);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId = req.user?.sessionId;

      if (sessionId) {
        await authService.logout(sessionId);
      }

      res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, ACCESS_COOKIE_OPTIONS);
      res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, REFRESH_COOKIE_OPTIONS);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Successfully logged out',
      });
    } catch (err) {
      next(err);
    }
  },
};
