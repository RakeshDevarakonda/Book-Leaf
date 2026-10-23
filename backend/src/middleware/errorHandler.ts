import { Request, Response, NextFunction } from 'express';
import { isCelebrateError } from 'celebrate';
import { AppError } from '../services/authService';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  // Handle Celebrate validation errors with our standard clean JSON structure
  if (isCelebrateError(err)) {
    const errorBody = err.details.get('body') || err.details.get('query') || err.details.get('params');
    const message = errorBody?.details[0]?.message || 'Validation error';

    res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION_ERROR,
        message,
      },
    });
    return;
  }

  const statusCode = err.statusCode || (err instanceof AppError ? err.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR);
  const code = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
  const message = err.message || 'An unexpected error occurred';

  if (statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.url}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};
