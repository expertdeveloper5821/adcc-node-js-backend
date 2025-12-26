import { Request, Response } from 'express';
import User from '@/models/user.model';
import { verifyFirebaseToken } from '@/services/firebase.service';
import {
  generateTokens,
  verifyRefreshToken,
  generateAccessToken,
} from '@/utils/jwt.util';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';

/**
 * Verify Firebase authentication
 * POST /v1/auth/verify
 * Returns JWT if user exists, or isNewUser flag if new
 */
export const verifyFirebaseAuth = asyncHandler(
  async (req: Request, res: Response) => {
    const { idToken, deviceId } = req.body;

    // Verify Firebase token
    const { phone } = await verifyFirebaseToken(idToken);

    // Check if user exists
    const user = await User.findOne({ phone });

    if (user) {
      // Existing user - return tokens + user
      const tokens = generateTokens({
        id: user._id.toString(),
        phone: user.phone,
      });

      // Store refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      user.refreshTokens.push({
        token: tokens.refreshToken,
        expiresAt,
        deviceId: deviceId || undefined,
        createdAt: new Date(),
      });
      await user.save();

      sendSuccess(
        res,
        {
          user: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            age: user.age,
            isVerified: user.isVerified,
          },
          ...tokens,
        },
        'Login successful'
      );
    } else {
      // New user - return temporary token (with phone only, no user ID)
      const tokens = generateTokens({
        phone,
      });

      sendSuccess(
        res,
        {
          isNewUser: true,
          phone,
          ...tokens,
        },
        'OTP verified. Please complete registration.'
      );
    }
  }
);

/**
 * Register new user
 * POST /v1/auth/register
 * Creates user with name and age
 */
export const registerUser = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { name, age, deviceId } = req.body;
    const phone = req.user?.phone; // From JWT (temporary token)

    if (!phone) {
      throw new AppError('Phone number not found in token', 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      throw new AppError('User already registered', 400);
    }

    // Create user
    const user = await User.create({
      name,
      phone,
      age,
      isVerified: true,
    });

    // Generate new tokens with user ID
    const tokens = generateTokens({
      id: user._id.toString(),
      phone: user.phone,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    user.refreshTokens.push({
      token: tokens.refreshToken,
      expiresAt,
      deviceId: deviceId || undefined,
      createdAt: new Date(),
    });
    await user.save();

    sendSuccess(
      res,
      {
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          age: user.age,
          isVerified: user.isVerified,
        },
        ...tokens,
      },
      'Registration successful'
    );
  }
);

/**
 * Refresh access token
 * POST /v1/auth/refresh
 */
export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded.id) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Check if refresh token exists in database
    const user = await User.findOne({
      _id: decoded.id,
      'refreshTokens.token': refreshToken,
      'refreshTokens.expiresAt': { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      id: user._id.toString(),
      phone: user.phone,
    });

    sendSuccess(res, { accessToken }, 'Token refreshed successfully');
  }
);

/**
 * Logout - Revoke refresh token
 * POST /v1/auth/logout
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Remove refresh token from database
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { token: refreshToken } },
  });

  sendSuccess(res, null, 'Logged out successfully');
});

/**
 * Get current user
 * GET /v1/auth/me
 */
export const getCurrentUser = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await User.findById(userId).select('-refreshTokens -__v');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    sendSuccess(res, user, 'User profile retrieved successfully');
  }
);

