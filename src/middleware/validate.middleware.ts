// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../utils/app-error';

export const validate =
  (schema: ZodType, source: 'body' | 'query' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const data = source === 'query' ? req.query : req.body;
    const result = schema.safeParse(data);

    if (!result.success) {
      const message = result.error.issues
        .map((e) => e.message)
        .join(', ');
      return next(new AppError(message, 400));
    }

    // For query params, merge validated data back (don't overwrite completely)
    if (source === 'query' && result.data) {
      Object.assign(req.query, result.data);
    } else if (source === 'body') {
      req.body = result.data;
    }

    next();
  };