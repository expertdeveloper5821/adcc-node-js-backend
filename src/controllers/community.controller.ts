import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Community from '@/models/community.model';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';
import { communityMembershipService } from '@/services';

interface JoinCommunityParams {
  communityId: string;
}

/**
 * Create new community
 * POST /v1/communities
 * Admin only
 */
export const createCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const communityData = {
    ...req.body,
    createdBy: userId,
    members: [], // Start with no members
    memberCount: 0,
  };

  const community = await Community.create(communityData);

  sendSuccess(res, community, 'Community created successfully', 201);
});

/**
 * Get all communities
 * GET /v1/communities
 * Public - with optional filters
 */
export const getAllCommunities = asyncHandler(async (req: Request, res: Response) => {
  const { type, location, category, search, page = 1, limit = 10, isActive, isPublic, isFeatured } = req.query;

  const query: any = {};

  // Filter by type
  if (type && ['Club', 'Shop', 'Women', 'Youth', 'Family', 'Corporate'].includes(type as string)) {
    query.type = type;
  }

  // Filter by location
  if (location && ['Abu Dhabi', 'Dubai', 'Al Ain', 'Sharjah'].includes(location as string)) {
    query.location = location;
  }

  // Filter by category (check if category array contains the query value)
  if (category) {
    query.category = { $in: [category] };
  }

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  // Filter by public status
  if (isPublic !== undefined) {
    query.isPublic = isPublic === 'true';
  }

  // Filter by featured status
  if (isFeatured !== undefined) {
    query.isFeatured = isFeatured === 'true';
  }

  // Text search
  if (search && typeof search === 'string') {
    query.$text = { $search: search };
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const communities = await Community.find(query)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email')
    .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Community.countDocuments(query);

  sendSuccess(
    res,
    {
      communities,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
    'Communities retrieved successfully'
  );
});

/**
 * Get community by ID
 * GET /v1/communities/:id
 * Public
 */
export const getCommunityById = asyncHandler(async (req: Request, res: Response) => {
 
  const { id } = req.params;

  if (Array.isArray(id) || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  const community = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email age gender');

  if (!community) {
    throw new AppError('Community not found', 404);
  }

  return sendSuccess(res, community, 'Community retrieved successfully');
});

/**
 * Update community
 * PATCH /v1/communities/:id
 * Admin only
 */
export const updateCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const community = await Community.findById(id);

  if (!community) {
    throw new AppError('Community not found', 404);
  }

  // Update fields
  Object.assign(community, req.body);
  await community.save();

  const updatedCommunity = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email');

  sendSuccess(res, updatedCommunity, 'Community updated successfully');
});

/**
 * Delete community
 * DELETE /v1/communities/:id
 * Admin only
 */
export const deleteCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const community = await Community.findByIdAndDelete(id);

  if (!community) {
    throw new AppError('Community not found', 404);
  }

  sendSuccess(res, null, 'Community deleted successfully');
});

/**
 * Join community
 * POST /v1/communities/:id/join
 * Authenticated users only
 */
export const joinCommunity = asyncHandler(async (req: AuthRequest & { params: JoinCommunityParams }, res: Response) => {
  const communityId = req.params.id;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const membership = await communityMembershipService.joinCommunity(userId, communityId);

  const updatedCommunity = await Community.findById(communityId)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email');

  sendSuccess(res, { community: updatedCommunity, membership }, 'Successfully joined community');
});

/**
 * Leave community
 * POST /v1/communities/:id/leave
 * Authenticated users only
 */
export const leaveCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const membership = await communityMembershipService.leaveCommunity(userId, id);

  const updatedCommunity = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email');

  sendSuccess(res, {community: updatedCommunity, membership }, 'Successfully left community');

});

/**
 * Get community members
 * GET /v1/communities/:id/members
 * Public
 */
export const getCommunityMembers = asyncHandler(async (req: Request, res: Response) => {
  
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);

  const members = await communityMembershipService.getCommunityMembers(id, pageNum, limitNum);

  sendSuccess(res, members, 'Community members retrieved successfully');
});


/*
* Get user community count
*/
export const getUserCommunityCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }
  const count = await communityMembershipService.getUserCommunities(userId);
  sendSuccess(res, { count }, 'User community count retrieved successfully');
});


/*
* Get baned users in a community
*/
export const getBannedUsersInCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const bannedUsers = await communityMembershipService.getBannedMembers(id);
  sendSuccess(res, bannedUsers, 'Banned users retrieved successfully');
});

/*
* is member of community
*/
export const isMemberOfCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { communityId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }
  const memberships = await communityMembershipService.isMember(userId, communityId);
  sendSuccess(res, { isMember: memberships }, 'Membership status retrieved successfully');
  
});
