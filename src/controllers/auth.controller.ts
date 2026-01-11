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
 * Supports both mobile (phone OTP) and web (email/password) authentication
 * Returns JWT if user exists, or isNewUser flag if new
 */
export const verifyFirebaseAuth = asyncHandler(
  async (req: Request, res: Response) => {
    const { idToken } = req.body;

    // Verify Firebase token - get UID, phone (for phone auth), email (for email/password auth)
    const { uid, phone, email } = await verifyFirebaseToken(idToken);

    // Find user by Firebase UID (primary lookup)
    const user = await User.findOne({ firebaseUid: uid });

    if (user) {
      // Existing user - return tokens + user
      const tokens = generateTokens({
        id: user._id.toString(),
        uid: user.firebaseUid,
        phone: user.phone || phone || '',
        email: user.email || email || '',
        role: user.role,
      });

      // Store refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      user.refreshTokens.push({
        token: tokens.refreshToken,
        expiresAt,
        createdAt: new Date(),
      });
      await user.save();

      sendSuccess(
        res,
        {
          user: {
            id: user._id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            gender: user.gender,
            age: user.age,
            role: user.role,
            isVerified: user.isVerified,
          },
          ...tokens,
        },
        'Login successful'
      );
    } else {
      // New user - return temporary token (with UID, no user ID)
      const tokens = generateTokens({
        uid,
        phone: phone || '',
        email: email || '',
      });

      sendSuccess(
        res,
        {
          isNewUser: true,
          uid,
          phone: phone || undefined,
          email: email || undefined,
          ...tokens,
        },
        'Authentication verified. Please complete registration.'
      );
    }
  }
);

/**
 * Register new user
 * POST /v1/auth/register
 * Creates user with fullName and gender
 * Supports both phone OTP (mobile) and email/password (web) authentication
 */
export const registerUser = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { fullName, gender, age } = req.body;
    const uid = req.user?.uid; // From JWT (temporary token)
    const phone = req.user?.phone; // Optional phone from JWT (for phone auth)
    const email = req.user?.email; // Optional email from JWT (for email/password auth)

    if (!uid) {
      throw new AppError('Firebase UID not found in token', 400);
    }

    // Validate that user has either phone or email (required for registration)
    if (!phone && !email) {
      throw new AppError('Either phone number or email address is required for registration', 400);
    }

    // Check if user already exists by UID
    const existingUser = await User.findOne({ firebaseUid: uid });
    if (existingUser) {
      throw new AppError('User already registered', 400);
    }

    // Create user with Firebase UID
    const user = await User.create({
      fullName,
      firebaseUid: uid,
      phone: phone || undefined,
      email: email || undefined,
      gender,
      age,
      isVerified: true,
    });

    // Generate new tokens with user ID
    const tokens = generateTokens({
      id: user._id.toString(),
      uid: user.firebaseUid,
      phone: user.phone || phone || '',
      email: user.email || email || '',
      role: user.role,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    user.refreshTokens.push({
      token: tokens.refreshToken,
      expiresAt,
      createdAt: new Date(),
    });
    await user.save();

    sendSuccess(
      res,
      {
        user: {
          id: user._id,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          gender: user.gender,
          role: user.role,
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
      uid: user.firebaseUid,
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
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

