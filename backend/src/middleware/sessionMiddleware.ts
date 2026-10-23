import { Request, Response, NextFunction } from 'express';
import { userRepository } from '../repositories/userRepository';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants';

export const validateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.sessionId) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED,
          message: 'Session identifier missing from token.',
        },
      });
      return;
    }

    const isRevoked = await userRepository.isSessionRevoked(req.user.sessionId);
    if (isRevoked) {
      res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.REVOKED_REFRESH_TOKEN,
          message: 'Your session has been logged out from this device.',
        },
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
};
