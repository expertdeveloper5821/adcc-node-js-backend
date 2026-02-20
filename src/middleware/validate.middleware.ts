import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../utils/app-error';

export const validate =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {

    let data: any = req.body;

    // If no body, fallback to params
    if (!data || Object.keys(data).length === 0) {
      if (Object.keys(req.params).length > 0) {
        data = req.params;
      } else {
        data = req.query;
      }
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(new AppError(JSON.stringify(formattedErrors, null, 2), 400));
    }

    // Assign validated data back
    if (data === req.body) {
      req.body = result.data;
    } else if (data === req.params) {
      Object.assign(req.params, result.data);
    } else {
      Object.assign(req.query, result.data);
    }

    next();
  };
