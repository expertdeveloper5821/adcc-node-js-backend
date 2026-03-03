import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import User from '@/models/user.model';

/**
 * Reject Guest with 403 (used by admin/vendor checks and requireMember).
 */
function rejectGuest(req: AuthRequest, res: Response, message: string): boolean {
  if (req.user?.role === 'Guest') {
    res.status(403).json({
      success: false,
      message,
    });
    return true;
  }
  return false;
}

/**
 * Middleware to check if user is admin
 */
export const isAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    if (rejectGuest(req, res, 'Access denied. Guest cannot perform this action.')) {
      return;
    }

    // Get user from database to check role
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.role !== 'Admin') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
      });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking admin status',
    });
  }
};

/**
 * Middleware to check if user is vendor
 */
export const isVendor = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    if (rejectGuest(req, res, 'Access denied. Guest cannot perform this action.')) {
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.role !== 'Vendor') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Vendor privileges required.',
      });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking vendor status',
    });
  }
};

/**
 * Middleware to check if user is admin or vendor
 */
export const isAdminOrVendor = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
      return;
    }

    if (rejectGuest(req, res, 'Access denied. Guest cannot perform this action.')) {
      return;
    }

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (user.role !== 'Admin' && user.role !== 'Vendor') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Admin or vendor privileges required.',
      });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking role',
    });
  }
};

/**
 * Middleware to require a member (or admin) account. Rejects Guest with 403.
 * Use on routes that require a real user (e.g. join community, join event).
 */
export const requireMember = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (rejectGuest(req, res, 'Member account required for this action.')) {
    return;
  }
  next();
};

