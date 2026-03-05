import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Community from '@/models/community.model';
import Event from '@/models/event.model';
import CommunityMembership from '@/models/communityMembership.model';
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
    // members array is not populated here to reduce payload; use memberCount instead
    .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Community.countDocuments(query);

  // attach upcoming event counts for each community
  const now = new Date();
  const communitiesWithCounts = await Promise.all(
    communities.map(async (comm) => {
      const upcomingEvents = await Event.countDocuments({
        communityId: comm._id,
        eventDate: { $gte: now },
      });
      const memberCount = await CommunityMembership.countDocuments({
        communityId: comm._id,
        status: 'active',
      });
      const commObj: any = comm.toObject();
      commObj.upcomingEventCount = upcomingEvents;
      commObj.memberCount = memberCount;
      return commObj;
    })
  );

  sendSuccess(
    res,
    {
      communities: communitiesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
    'Communities retrieved successfully', 201
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

  // include upcoming event count and accurate member count from membership collection
  const now = new Date();
  const upcomingEvents = await Event.countDocuments({
    communityId: community._id,
    eventDate: { $gte: now },
  });
  const memberCount = await CommunityMembership.countDocuments({
    communityId: community._id,
    status: 'active',
  });

  const communityObj: any = community.toObject();
  communityObj.upcomingEventCount = upcomingEvents;
  communityObj.memberCount = memberCount;

  return sendSuccess(res, communityObj, 'Community retrieved successfully', 201);
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

  sendSuccess(res, updatedCommunity, 'Community updated successfully', 201);
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

  sendSuccess(res, null, 'Community deleted successfully', 201);
});

/**
 * Join community
 * POST /v1/communities/:id/join
 * Authenticated users only
 */
export const joinCommunity = asyncHandler(async (req: AuthRequest & { params: JoinCommunityParams }, res: Response) => {
  const communityId = req.params.id;
  const userId = req.user?.id;
  const isGuest = req.user?.isGuest;
  
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (isGuest) {
    throw new AppError('Please register to join communities', 403);
  }

  const membership = await communityMembershipService.joinCommunity(userId, communityId);

  const communityDoc = await Community.findById(communityId).select('title location type');

  // message based on resulting status
  const message = membership.status === 'active' ?
    'Successfully joined community' :
    'Successfully left community';

  sendSuccess(res, { community: communityDoc, membership }, message, 201);
});

/**
 * Leave community
 * POST /v1/communities/:id/leave
 * Authenticated users only
 */
export const leaveCommunity = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const result = await communityMembershipService.leaveCommunity(userId, id);

    sendSuccess(res, result, 'Successfully left community', 200);
  }
);

/**
 * Get community members
 * GET /v1/communities/:id/members
 * Public
 */
export const getCommunityMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  
  const id = req.params.id as string;
  
  const { page = 1, limit = 10 } = req.query;


  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);

  const members = await communityMembershipService.getCommunityMembers(id, pageNum, limitNum);

  sendSuccess(res, members, 'Community members retrieved successfully', 201);
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
  sendSuccess(res, { count }, 'User community count retrieved successfully', 201);
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
  sendSuccess(res, bannedUsers, 'Banned users retrieved successfully', 201);
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
  sendSuccess(res, { isMember: memberships }, 'Membership status retrieved successfully', 201);
  
});

/**
 * Add images to community gallery
 * POST /v1/communities/:id/gallery
 * Admin only
 */
export const addGalleryImages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { images } = req.body;

  const community = await Community.findById(id);

  if (!community) {
    throw new AppError('Community not found', 404);
  }

  // Initialize gallery array if it doesn't exist
  if (!community.gallery) {
    community.gallery = [];
  }

  // Add new images, avoiding duplicates
  const existingImages = new Set(community.gallery);
  const newImages = images.filter((imageUrl: string) => !existingImages.has(imageUrl));
  
  if (newImages.length === 0) {
    throw new AppError('All provided images already exist in the gallery', 400);
  }

  community.gallery = [...community.gallery, ...newImages];
  await community.save();

  const updatedCommunity = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email');

  if (!updatedCommunity) {
    throw new AppError('Failed to retrieve updated community', 500);
  }

  sendSuccess(
    res,
    {
      community: updatedCommunity,
      addedImages: newImages,
      totalImages: updatedCommunity.gallery?.length || 0,
    },
    `Successfully added ${newImages.length} image(s) to gallery`,
    201
  );
});

/**
 * Remove images from community gallery
 * DELETE /v1/communities/:id/gallery
 * Admin only
 */
export const removeGalleryImages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { imageUrls } = req.body;

  const community = await Community.findById(id);

  if (!community) {
    throw new AppError('Community not found', 404);
  }

  // Initialize gallery array if it doesn't exist
  if (!community.gallery || community.gallery.length === 0) {
    throw new AppError('Gallery is empty', 400);
  }

  // Remove images that exist in the gallery
  const imagesToRemove = new Set(imageUrls);
  const removedImages = community.gallery.filter((imageUrl) => imagesToRemove.has(imageUrl));
  
  community.gallery = community.gallery.filter((imageUrl) => !imagesToRemove.has(imageUrl));
  
  const removedCount = removedImages.length;

  if (removedCount === 0) {
    throw new AppError('None of the provided images were found in the gallery', 400);
  }

  await community.save();

  const updatedCommunity = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email');

  if (!updatedCommunity) {
    throw new AppError('Failed to retrieve updated community', 500);
  }

  sendSuccess(
    res,
    {
      community: updatedCommunity,
      removedImages,
      removedCount,
      totalImages: updatedCommunity.gallery?.length || 0,
    },
    `Successfully removed ${removedCount} image(s) from gallery`,
    201
  );
});

/**
 * Get community gallery images
 * GET /v1/communities/:id/gallery
 * Public
 */
export const getGalleryImages = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const community = await Community.findById(id).select('gallery title');

  if (!community) {
    throw new AppError('Community not found', 404);
  }

  sendSuccess(
    res,
    {
      communityId: id,
      communityTitle: community.title,
      gallery: community.gallery || [],
      imageCount: community.gallery?.length || 0,
    },
    'Gallery images retrieved successfully',
    201
  );
});
