import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { t } from "@/utils/i18n";
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
  const lang = (req as any).lang;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }

  const communityData = {
    ...req.body,
    createdBy: userId,
    members: [], // Start with no members
    memberCount: 0,
  };

  const community = await Community.create(communityData);

  sendSuccess(res, community, t(lang,"community.created"), 201);
});

/**
 * Get all communities
 * GET /v1/communities
 * Public - with optional filters
 */
export const getAllCommunities = asyncHandler(async (req: Request, res: Response ) => {
  const lang = (req as any).lang;
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
    t(lang, "community.all_communities"), 200
  );
});

/**
 * Get community by ID
 * GET /v1/communities/:id
 * Public
 */
export const getCommunityById = asyncHandler(async (req: Request, res: Response) => {
  const lang = (req as any).lang;
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
    throw new AppError(t(lang, "auth.unauthorized"), 404);
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

  return sendSuccess(res, communityObj, t(lang,"community.details_retrieved"), 201);
});

/**
 * Update community
 * PATCH /v1/communities/:id
 * Admin only
 */
export const updateCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = (req as any).lang;
  const { id } = req.params;

  const community = await Community.findById(id);

  if (!community) {
    throw new AppError(t(lang, "auth.unauthorized"), 404);
  }

  // Update fields
  Object.assign(community, req.body);
  await community.save();

  const updatedCommunity = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email');

  sendSuccess(res, updatedCommunity, t(lang,"community.updated"), 201);
});

/**
 * Delete community
 * DELETE /v1/communities/:id
 * Admin only
 */
export const deleteCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = (req as any).lang;
  const { id } = req.params;

  const community = await Community.findByIdAndDelete(id);

  if (!community) {
    throw new AppError(t(lang, "auth.unauthorized"), 404);
  }

  sendSuccess(res, null, t(lang, "community.deleted"), 201);
});

/**
 * Join community
 * POST /v1/communities/:id/join
 * Authenticated users only
 */
export const joinCommunity = asyncHandler(async (req: AuthRequest & { params: JoinCommunityParams }, res: Response) => {
  const lang = (req as any).lang;
  const communityId = req.params.id;
  const userId = req.user?.id;
  const isGuest = req.user?.isGuest;
  
  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }

  if (isGuest) {
    throw new AppError(t(lang, "guest.access_denied"), 403);
  }

  const membership = await communityMembershipService.joinCommunity(userId, communityId);

  const communityDoc = await Community.findById(communityId).select('title location type');

  // message based on resulting status
  const message = membership.status === 'active' ?
    t(lang, "community.joined") :
    t(lang, "community.leave");

  sendSuccess(res, { community: communityDoc, membership }, message, 201);
});

/**
 * Leave community
 * POST /v1/communities/:id/leave
 * Authenticated users only
 */
export const leaveCommunity = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const lang = (req as any).lang;
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError(t(lang, "auth.unauthorized"), 401);
    }

    const result = await communityMembershipService.leaveCommunity(userId, id);

    sendSuccess(res, result, t(lang, "community.leave"), 200);
  }
);

/**
 * Get community members
 * GET /v1/communities/:id/members
 * Public
 */
export const getCommunityMembers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = (req as any).lang;
  const id = req.params.id as string;
  
  const { page = 1, limit = 10 } = req.query;


  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Number(limit) || 10);

  const members = await communityMembershipService.getCommunityMembers(id, pageNum, limitNum);

  sendSuccess(res, members, t(lang,"community.memberRetrieved"), 201);
});


/*
* Get user community count
*/
export const getUserCommunityCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = (req as any).lang;

  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }
  const count = await communityMembershipService.getUserCommunities(userId);
  sendSuccess(res, { count }, t(lang,"community.memberCount"), 201);
});


/*
* Get baned users in a community
*/
export const getBannedUsersInCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = (req as any).lang;
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }

  const bannedUsers = await communityMembershipService.getBannedMembers(id);
  sendSuccess(res, bannedUsers, t(lang, "community.bannedUsers"), 201);
});

/*
* is member of community
*/
export const isMemberOfCommunity = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = (req as any).lang;
  const { communityId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }
  const memberships = await communityMembershipService.isMember(userId, communityId);
  sendSuccess(res, { isMember: memberships }, t(lang, "community.status_retrieved"), 201);
  
});

/**
 * Add images to community gallery
 * POST /v1/communities/:id/gallery
 * Admin only
 */
export const addGalleryImages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = (req as any).lang;
  const { id } = req.params;
  const { images } = req.body;

  const community = await Community.findById(id);

  if (!community) {
    throw new AppError(t(lang, "community.not_found"), 404);
  }

  // Initialize gallery array if it doesn't exist
  if (!community.gallery) {
    community.gallery = [];
  }

  // Add new images, avoiding duplicates
  const existingImages = new Set(community.gallery);
  const newImages = images.filter((imageUrl: string) => !existingImages.has(imageUrl));
  
  if (newImages.length === 0) {
    throw new AppError(t(lang, "community.gallery_all_exist"), 400);
  }

  community.gallery = [...community.gallery, ...newImages];
  await community.save();

  const updatedCommunity = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email');

  if (!updatedCommunity) {
    throw new AppError(t(lang, "community.not_found"), 500);
  }

  sendSuccess(
    res,
    {
      community: updatedCommunity,
      addedImages: newImages,
      totalImages: updatedCommunity.gallery?.length || 0,
    },
    t(lang, "community.gallery_added", { count: newImages.length }),
    201
  );
});

/**
 * Remove images from community gallery
 * DELETE /v1/communities/:id/gallery
 * Admin only
 */
export const removeGalleryImages = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = (req as any).lang;
  const { id } = req.params;
  const { imageUrls } = req.body;

  const community = await Community.findById(id);

  if (!community) {
    throw new AppError(t(lang, "community.not_found"), 404);
  }

  // Initialize gallery array if it doesn't exist
  if (!community.gallery || community.gallery.length === 0) {
    throw new AppError(t(lang, "community.gallery_empty"), 400);
  }

  // Remove images that exist in the gallery
  const imagesToRemove = new Set(imageUrls);
  const removedImages = community.gallery.filter((imageUrl) => imagesToRemove.has(imageUrl));
  
  community.gallery = community.gallery.filter((imageUrl) => !imagesToRemove.has(imageUrl));
  
  const removedCount = removedImages.length;

  if (removedCount === 0) {
    throw new AppError(t(lang, "community.gallery_none_found"), 400);
  }

  await community.save();

  const updatedCommunity = await Community.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('members', 'fullName email');

  if (!updatedCommunity) {
    throw new AppError(t(lang, "community.not_found"), 500);
  }

  sendSuccess(
    res,
    {
      community: updatedCommunity,
      removedImages,
      removedCount,
      totalImages: updatedCommunity.gallery?.length || 0,
    },
    t(lang, "community.gallery_removed", { count: removedCount }),
    201
  );
});

/**
 * Get community gallery images
 * GET /v1/communities/:id/gallery
 * Public
 */
export const getGalleryImages = asyncHandler(async (req: Request, res: Response) => {
  const lang = (req as any).lang;
  const { id } = req.params;

  const community = await Community.findById(id).select('gallery title');

  if (!community) {
    throw new AppError(t(lang, "community.not_found"), 404);
  }

  sendSuccess(
    res,
    {
      communityId: id,
      communityTitle: community.title,
      gallery: community.gallery || [],
      imageCount: community.gallery?.length || 0,
    },
    t(lang, "community.gallery_retrieved"),
    201
  );
});
