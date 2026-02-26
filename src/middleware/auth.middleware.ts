import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JWTPayload } from '@/utils/jwt.util';

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      });
      return;
    }

    const decoded = verifyAccessToken(token);

    if (decoded.type === 'Guest' || decoded.role === 'Guest' || decoded.isGuest) {
      req.user = {
        role: 'Guest',
        isGuest: true,
        // Add a virtual guest ID for consistency
        id: `guest_${decoded.uid || 'anonymous'}`,
        guestId: decoded.uid || 'anonymous',
      };
      return next();
    }

    if (!decoded.id) {
      res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
      return;
    }

    req.user = {
        ...decoded,
        isGuest: false,
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid or expired token',
    });
  }
};

