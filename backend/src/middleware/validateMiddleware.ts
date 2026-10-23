import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { ERROR_CODES, HTTP_STATUS } from '../config/constants';

type RequestPart = 'body' | 'query' | 'params';

export const validate = (schema: Schema, part: RequestPart = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[part], {
      abortEarly: true,
      stripUnknown: true, // remove unknown fields
    });

    if (error) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: error.details[0].message,
        },
      });
      return;
    }

    // Replace with validated, sanitized values
    req[part] = value;
    next();
  };
};
