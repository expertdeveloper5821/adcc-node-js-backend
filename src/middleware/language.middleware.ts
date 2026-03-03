import { Response, NextFunction } from "express";
import { AuthRequest } from './auth.middleware';

export const languageMiddleware = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const lang = req.headers["accept-language"];

  // Check if the header starts with 'ar' (handles 'ar', 'ar-AE', etc.)
  (req as any).lang = (lang as string)?.toLowerCase().startsWith("ar") ? "ar" : "en";

  next();
};