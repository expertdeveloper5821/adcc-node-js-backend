import { Request, Response } from 'express';
import Community from '@/models/community.model';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';

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
  const { type, location, category, search, page = 1, limit = 10, isActive } = req.query;

  const query: any = {};

  // Filter by type
  if (type && ['city', 'group', 'awareness'].includes(type as string)) {
    query.type = type;
  }

  // Filter by location
  if (location && ['Abu Dhabi', 'Al Ain', 'Western Region'].includes(location as string)) {
    query.location = location;
  }

  // Filter by category
  if (category) {
    query.category = category;
  }

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
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

  const community = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email age gender');

  if (!community) {
    throw new AppError('Community not found', 404);
  }

  sendSuccess(res, community, 'Community retrieved successfully');
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
export const joinCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const community = await Community.findById(id);

  if (!community) {
    throw new AppError('Community not found', 404);
  }

  if (!community.isActive) {
    throw new AppError('Community is not active', 400);
  }

  // Check if user is already a member
  if (community.members.includes(userId as any)) {
    throw new AppError('User is already a member of this community', 400);
  }

  // Add user to members
  community.members.push(userId as any);
  await community.save();

  const updatedCommunity = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email');

  sendSuccess(res, updatedCommunity, 'Successfully joined community');
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

  const community = await Community.findById(id);

  if (!community) {
    throw new AppError('Community not found', 404);
  }

  // Check if user is a member
  if (!community.members.includes(userId as any)) {
    throw new AppError('User is not a member of this community', 400);
  }

  // Remove user from members
  community.members = community.members.filter(
    (memberId) => memberId.toString() !== userId
  );
  await community.save();

  const updatedCommunity = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email');

  sendSuccess(res, updatedCommunity, 'Successfully left community');
});

/**
 * Get community members
 * GET /v1/communities/:id/members
 * Public
 */
export const getCommunityMembers = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const community = await Community.findById(id).populate({
    path: 'members',
    select: 'fullName email age gender',
    options: {
      skip: (Number(page) - 1) * Number(limit),
      limit: Number(limit),
    },
  });

  if (!community) {
    throw new AppError('Community not found', 404);
  }

  sendSuccess(
    res,
    {
      members: community.members,
      total: community.memberCount,
      page: Number(page),
      limit: Number(limit),
    },
    'Community members retrieved successfully'
  );
});

