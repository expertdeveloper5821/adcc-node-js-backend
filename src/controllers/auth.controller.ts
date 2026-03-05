import { Request, Response } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import User from '@/models/user.model';
import EventResult from '@/models/eventResult.model';
import { verifyFirebaseToken } from '@/services/firebase.service';
import { communityMembershipService } from '@/services';
import { RIDE_CATEGORIES } from '@/services/user-stats.service';
import {
  generateTokens,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} from '@/utils/jwt.util';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';

/** Guest role and ID prefix - guest users are stateless (no DB record) */
const GUEST_ROLE = 'Guest';
const GUEST_ID_PREFIX = 'guest_';

function isGuestPayload(id?: string, role?: string): boolean {
  return role === GUEST_ROLE && typeof id === 'string' && id.startsWith(GUEST_ID_PREFIX);
}

/**
 * Create guest session (stateless)
 * POST /v1/auth/guest
 * Issues JWT with role Guest; no DB write. For "Continue as Guest" flows.
 */
export const createGuestSession = asyncHandler(
  async (_req: Request, res: Response) => {
    const guestId = GUEST_ID_PREFIX + crypto.randomUUID();
    const tokens = generateTokens({
      id: guestId,
      role: GUEST_ROLE,
    });

    sendSuccess(
      res,
      {
        user: {
          id: guestId,
          role: GUEST_ROLE,
          isGuest: true,
        },
        ...tokens,
      },
      'Guest session created'
    );
  }
);

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
      // Clean up expired tokens first
      const now = new Date();
      user.refreshTokens = user.refreshTokens.filter(
        (token) => token.expiresAt >= now
      );

      // Check if user has reached the maximum number of active devices
      if (user.refreshTokens.length >= Number(process.env.MAX_REFRESH_TOKENS)) {
        throw new AppError(
          `Maximum number of devices (${process.env.MAX_REFRESH_TOKENS}) reached. Please sign out from other devices to continue.`,
          403
        );
      }

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
      expiresAt.setDate(expiresAt.getDate() + 3); // 3 days

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

    // For new users, they start with 0 tokens, so no need to check limit
    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3); // 3 days

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
 * Implements token rotation: issues new refresh token and revokes old one
 * Also cleans up expired tokens from database
 */
export const refreshAccessToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded.id) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Guest refresh: stateless; no DB lookup
    if (isGuestPayload(decoded.id, decoded.role)) {
      const tokens = generateTokens({
        id: decoded.id,
        role: GUEST_ROLE,
      });
      sendSuccess(
        res,
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
        'Token refreshed successfully'
      );
      return;
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

    // Token rotation: Generate new refresh token
    const newRefreshToken = generateRefreshToken({
      id: user._id.toString(),
      uid: user.firebaseUid,
      phone: user.phone || '',
      email: user.email || '',
      role: user.role,
    });

    // Calculate expiry date for new refresh token (3 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 3);

    // Filter out expired tokens and the old refresh token, then add new one
    const now = new Date();
    const filteredTokens = user.refreshTokens.filter(
      (token) =>
        token.expiresAt >= now && token.token !== refreshToken
    );

    // Add new refresh token
    filteredTokens.push({
      token: newRefreshToken,
      expiresAt,
      createdAt: new Date(),
    });

    // Update user with filtered tokens array (atomic operation)
    await User.findByIdAndUpdate(
      user._id,
      {
        $set: {
          refreshTokens: filteredTokens,
        },
      },
      { new: true }
    );

    sendSuccess(
      res,
      { accessToken, refreshToken: newRefreshToken },
      'Token refreshed successfully'
    );
  }
);

/**
 * Logout - Revoke refresh token
 * POST /v1/auth/logout
 * For Guest: no-op (no DB state to revoke).
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (isGuestPayload(userId, req.user?.role)) {
    sendSuccess(res, null, 'Logged out successfully');
    return;
  }

  const { refreshToken } = req.body;
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { token: refreshToken } },
  });

  sendSuccess(res, null, 'Logged out successfully');
});

/**
 * Get current user stats (distance, rides, events participated)
 * GET /v1/auth/me/stats
 * Requires member (guest gets 403).
 * Reads from materialized User.stats; runs aggregation once for legacy users and backfills.
 */
export const getCurrentUserStats = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const user = await User.findById(userId).select('stats').lean();
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const s = user.stats;
    const hasMaterializedStats =
      s &&
      typeof s.totalDistanceKm === 'number' &&
      typeof s.totalRides === 'number' &&
      typeof s.totalEventsParticipated === 'number';

    if (hasMaterializedStats) {
      sendSuccess(res, { ...s }, 'User stats retrieved successfully');
      return;
    }

    const objectIdUserId = new mongoose.Types.ObjectId(userId);
    const results = await EventResult.aggregate([
      {
        $match: {
          userId: objectIdUserId,
          status: { $in: ['joined', 'completed'] },
        },
      },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: { path: '$event', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: null,
          totalDistanceKm: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $ifNull: ['$distance', 0] },
                0,
              ],
            },
          },
          totalEventsParticipated: { $sum: 1 },
          totalRides: {
            $sum: {
              $cond: [
                { $in: ['$event.category', RIDE_CATEGORIES] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const stats = results[0]
      ? {
          totalDistanceKm: Number(results[0].totalDistanceKm ?? 0),
          totalRides: Number(results[0].totalRides ?? 0),
          totalEventsParticipated: Number(results[0].totalEventsParticipated ?? 0),
        }
      : {
          totalDistanceKm: 0,
          totalRides: 0,
          totalEventsParticipated: 0,
        };

    await User.findByIdAndUpdate(userId, { $set: { stats } });

    sendSuccess(res, stats, 'User stats retrieved successfully');
  }
);

/**
 * Get current user's joined communities (paginated)
 * GET /v1/auth/me/joined-communities
 * Member only.
 */
export const getMyJoinedCommunities = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const result = await communityMembershipService.getMyJoinedCommunities(userId, page, limit);
    sendSuccess(res, result, 'Joined communities retrieved successfully');
  }
);

/**
 * Get current user's joined events (paginated)
 * GET /v1/auth/me/joined-events
 * Member only.
 */
export const getMyJoinedEvents = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const filter = { userId, status: { $in: ['joined', 'completed'] } };

    const [results, total] = await Promise.all([
      EventResult.find(filter)
        .select('eventId status distance time createdAt')
        .populate('eventId', 'title eventDate eventTime address city status mainImage communityId trackId category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventResult.countDocuments(filter),
    ]);

    const events = results.map((r: any) => {
      const item: any = {
        event: r.eventId,
        participationStatus: r.status,
        joinedAt: r.createdAt,
      };
      if (r.status === 'completed') {
        item.distance = r.distance;
        item.time = r.time;
      }
      return item;
    });

    sendSuccess(
      res,
      {
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
      'Joined events retrieved successfully'
    );
  }
);

/**
 * Get current user's active (joined, not yet completed) rides and events
 * GET /v1/auth/me/active-participations
 * Member only.
 */
export const getMyActiveParticipations = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { userId, status: 'joined' };

    const [results, total] = await Promise.all([
      EventResult.find(filter)
        .select('eventId status createdAt')
        .populate('eventId', 'title eventDate eventTime address city status mainImage communityId trackId category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EventResult.countDocuments(filter),
    ]);

    const rides: any[] = [];
    const events: any[] = [];

    for (const r of results as any[]) {
      const item = {
        event: r.eventId,
        joinedAt: r.createdAt,
      };
      if (RIDE_CATEGORIES.includes(r.eventId?.category)) {
        rides.push(item);
      } else {
        events.push(item);
      }
    }

    sendSuccess(
      res,
      {
        rides,
        events,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
      'Active participations retrieved successfully'
    );
  }
);

/**
 * Get current user
 * GET /v1/auth/me
 * For Guest: returns minimal profile from JWT (no DB).
 */
export const getCurrentUser = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    if (isGuestPayload(userId, req.user?.role)) {
      sendSuccess(
        res,
        {
          id: userId,
          role: GUEST_ROLE,
          isGuest: true,
        },
        'User profile retrieved successfully'
      );
      return;
    }

    const user = await User.findById(userId).select('-refreshTokens -__v');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    sendSuccess(res, user, 'User profile retrieved successfully');
  }
);

