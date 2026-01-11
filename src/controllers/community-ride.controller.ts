import { Request, Response } from 'express';
import CommunityRide from '@/models/community-ride.model';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';

/**
 * Create new community ride
 * POST /v1/community-rides
 * Admin only
 */
export const createCommunityRide = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const rideData = {
    ...req.body,
    date: req.body.date ? new Date(req.body.date) : undefined,
    createdBy: userId,
  };

  const ride = await CommunityRide.create(rideData);

  sendSuccess(res, ride, 'Community ride created successfully', 201);
});

/**
 * Get all community rides
 * GET /v1/community-rides
 * Public - with optional filters
 */
export const getAllCommunityRides = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = 1, limit = 10 } = req.query;

  // Build filter object
  const filter: any = {};

  if (status) filter.status = status;

  // Pagination
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get community rides
  const rides = await CommunityRide.find(filter)
    .populate('createdBy', 'fullName email')
    .sort({ date: 1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Get total count
  const total = await CommunityRide.countDocuments(filter);

  sendSuccess(
    res,
    {
      rides,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
    'Community rides retrieved successfully'
  );
});

/**
 * Get community ride by ID
 * GET /v1/community-rides/:id
 * Public
 */
export const getCommunityRideById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const ride = await CommunityRide.findById(id).populate('createdBy', 'fullName email');

  if (!ride) {
    throw new AppError('Community ride not found', 404);
  }

  sendSuccess(res, ride, 'Community ride retrieved successfully');
});

/**
 * Update community ride
 * PATCH /v1/community-rides/:id
 * Admin only
 */
export const updateCommunityRide = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // Convert date string to Date if provided
  if (updateData.date) {
    updateData.date = new Date(updateData.date);
  }

  const ride = await CommunityRide.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate('createdBy', 'fullName email');

  if (!ride) {
    throw new AppError('Community ride not found', 404);
  }

  sendSuccess(res, ride, 'Community ride updated successfully');
});

/**
 * Delete community ride
 * DELETE /v1/community-rides/:id
 * Admin only
 */
export const deleteCommunityRide = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const ride = await CommunityRide.findByIdAndDelete(id);

  if (!ride) {
    throw new AppError('Community ride not found', 404);
  }

  sendSuccess(res, null, 'Community ride deleted successfully');
});

