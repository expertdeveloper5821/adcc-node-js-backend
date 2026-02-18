import { Request, Response } from 'express';
import Event from '@/models/event.model';
import Track from '@/models/track.model';
import Community from '@models/community.model';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';
import mongoose from 'mongoose';


/**
 * Create new event
 * POST /v1/events
 * Admin only
 */
export const createTrack = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  console.log(userId);
    if (!userId) {
    throw new AppError('User not authenticated', 401);
    }
    const teackData = {
    ...req.body,
    teackData: req.body.teackData ? new Date(req.body.teackData) : undefined,
    createdBy: userId,
    };
    const event = await Track.create(teackData);
    sendSuccess(res, event, 'Track created successfully', 201);
});

/**
 * Get all events
 * GET /v1/events
 * Public - with optional filters
 * */
    export const getAllTracks = asyncHandler(async (req: Request, res: Response) => {
    const { status, city, type, page = 1, limit = 10 } = req.query;
    
    const query: any = {};
    if (status) query.status = status;
    if (city && ['Abu Dhabi', 'Dubai', 'Al Ain', 'Sharjah'].includes(city as string)) query.city = city;
    if (type && ['loop', 'road', 'mixed', 'out-and-back', 'point-to-point'].includes(type as string)) query.type = type;
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const tracks = await Track.find(query)
    .populate('createdBy', 'fullName email')
    .sort({ eventDate: 1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);
    // Get total count
    const total = await Track.countDocuments(query);
    sendSuccess(res, { tracks, total, page: pageNum, limit: limitNum }, 'Tracks retrieved successfully');
});

/**
 * Get track by ID
 * GET /v1/tracks/:id
 * Public
 * */
export const getTrackById = asyncHandler(async (req: Request, res: Response) => {

    const trackId = Array.isArray(req.params.trackId)
    ? req.params.trackId[0]
    : req.params.trackId;

    const track = await Track.findById(trackId);
    if (!track) {
        throw new AppError('Track not found', 404);
    }
    return sendSuccess(res, track, 'Track retrieved successfully', 201);
});

/**
 * Update track
 * PATCH /v1/tracks/:id
 * Admin only
 * */
export const updateTrack = asyncHandler(async (req: AuthRequest, res: Response) => {
  const trackId = Array.isArray(req.params.trackId)
    ? req.params.trackId[0]
    : req.params.trackId;
    
    // console.log('req.body:', req.body);
    const track = await Track.findByIdAndUpdate(trackId, req.body, { new: true });
    if (!track) {
         throw new AppError('Track not found', 404);
    }

    return sendSuccess(res, track, 'Track updated successfully', 201);
});

/**
 * Delete track
 * DELETE /v1/tracks/:id
 * Admin only
 * */
export const deleteTrack = asyncHandler(async (req: AuthRequest, res: Response) => {
    const trackId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

    const track = await Track.findByIdAndDelete(trackId);
    if (!track) {
            throw new AppError('Track not found', 404);
    }
    return sendSuccess(res, null, 'Track deleted successfully', 201);
});

/**
 * Track realted events resuts
 * */
export const getTrackResults = asyncHandler(async (req: Request, res: Response) => {

  const trackIdParam = Array.isArray(req.params.trackId)
    ? req.params.trackId[0]
    : req.params.trackId;

    if (!mongoose.Types.ObjectId.isValid(trackIdParam)) {
        throw new AppError('Invalid trackId', 400);
      }

    

  const results = await Event.aggregate([
  {
    $match: {
      trackId: new mongoose.Types.ObjectId(trackIdParam),
    },
  },
  {
    $addFields: {
      safeTime: { $ifNull: ['$time', Number.MAX_SAFE_INTEGER] },
    },
  },
  { $sort: { safeTime: 1 } },
  {
    $setWindowFields: {
      sortBy: { safeTime: 1 },
      output: { rank: { $rank: {} } },
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'user',
    },
  },
]);


  sendSuccess(res, results, 'Track related results retrieved successfully', 200);
});


/**
 * Track related community photos for an event
 * */
export const trackCommunityPhotos = asyncHandler(async (req: AuthRequest, res: Response) => {
  const trackIdParam = Array.isArray(req.params.trackId)
    ? req.params.trackId[0]
    : req.params.trackId;
    if (!mongoose.Types.ObjectId.isValid(trackIdParam)) {
        throw new AppError('Invalid trackId', 400);
      }

  const eventIdParam = Array.isArray(req.params.eventId)
    ? req.params.eventId[0]
    : req.params.eventId;
    if (!mongoose.Types.ObjectId.isValid(eventIdParam)) {
        throw new AppError('Invalid eventId', 400);
      }

  const communityIdParam = Array.isArray(req.params.Id)
    ? req.params.Id[0]
    : req.params.Id;
    if (!mongoose.Types.ObjectId.isValid(communityIdParam)) {
        throw new AppError('Invalid communityId', 400);
      }

  const photos = await Event.findOne({
    _id: new mongoose.Types.ObjectId(eventIdParam),
    trackId: new mongoose.Types.ObjectId(trackIdParam),
    communityId: new mongoose.Types.ObjectId(communityIdParam),
  }).select('communityPhotos');

  sendSuccess(res, photos, 'Community photos retrieved successfully', 200);

});

/**
 * Track related community results for an event
 * */

export const trackCommunityResults = asyncHandler(async (req: AuthRequest, res: Response) => {
  
  // console.log('Track event - Params:', req.params);
  const trackIdParam = Array.isArray(req.params.trackId)
    ? req.params.trackId[0]
    : req.params.trackId;

    if (!mongoose.Types.ObjectId.isValid(trackIdParam)) {
        throw new AppError('Invalid trackId', 400);
      } 

  const results = await Community.aggregate([
  {
    $match: {
      trackId: new mongoose.Types.ObjectId(trackIdParam)
    },
  },
  {
    $addFields: {
      safeTime: { $ifNull: ['$time', Number.MAX_SAFE_INTEGER] },
    },
  },
  { $sort: { safeTime: 1 } },
  {
    $setWindowFields: {
      sortBy: { safeTime: 1 },
      output: { rank: { $rank: {} } },  
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'userId',
      foreignField: '_id',
      as: 'user',
    },
  },
]);

    sendSuccess(res, results, 'Track related community results retrieved successfully', 200);

});

