import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthTokenPayload, UserRole } from '../types/auth';
import { COOKIE_NAMES, ERROR_CODES, HTTP_STATUS } from '../config/constants';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  let token = req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication required. No access token provided.',
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as AuthTokenPayload;
    req.user = decoded;
    next();
  } catch (err: unknown) {
    const isExpired = err instanceof jwt.TokenExpiredError;
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: isExpired ? ERROR_CODES.TOKEN_EXPIRED : ERROR_CODES.INVALID_TOKEN,
        message: isExpired ? 'Access token has expired.' : 'Invalid access token.',
      },
    });
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required.',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.FORBIDDEN,
          message: 'You do not have permission to access this resource.',
        },
      });
      return;
    }

    next();
  };
};
