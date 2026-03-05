import { Request, Response } from 'express';
import { t } from "@/utils/i18n";
import Event from '@/models/event.model';
import Track from '@/models/track.model';
import Community from '@models/community.model';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';
import mongoose from 'mongoose';
import { localizeDocumentFields, SupportedLanguage, localizeTrackStatic } from '@/utils/localization';

const TRACK_LOCALIZED_FIELDS = {
  title: 'titleAr',
  description: 'descriptionAr',
};

const localizeTrack = (track: Record<string, any>, lang: SupportedLanguage) => {
  const localized = localizeDocumentFields(track, lang, TRACK_LOCALIZED_FIELDS);
  localizeTrackStatic(localized, lang);
  return localized;
};


/**
 * Create new event
 * POST /v1/events
 * Admin only
 */
export const createTrack = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const userId = req.user?.id;
  // console.log(userId);
    if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
    }
    const teackData = {
    ...req.body,
    titleAr: req.body.titleAr || req.body.title,
    descriptionAr: req.body.descriptionAr || req.body.description,
    teackData: req.body.teackData ? new Date(req.body.teackData) : undefined,
    createdBy: userId,
    };
    const event = await Track.create(teackData);
    sendSuccess(res, localizeTrack(event.toObject(), lang), t(lang, "track.created"), 201);
});

/**
 * Get all events
 * GET /v1/events
 * Public - with optional filters
 * */
    export const getAllTracks = asyncHandler(async (req: Request, res: Response) => {
      const lang = ((req as any).lang || 'en') as SupportedLanguage;
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
    const localizedTracks = tracks.map((track) => localizeTrack(track.toObject(), lang));

    // Get total count
    const total = await Track.countDocuments(query);
    sendSuccess(res, { tracks: localizedTracks, total, page: pageNum, limit: limitNum }, t(lang, "track.allTracks"), 200);
});

/**
 * Get track by ID
 * GET /v1/tracks/:id
 * Public
 * */
export const getTrackById = asyncHandler(async (req: Request, res: Response) => {
    const lang = ((req as any).lang || 'en') as SupportedLanguage;

    const trackId = Array.isArray(req.params.trackId)
    ? req.params.trackId[0]
    : req.params.trackId;

    const track = await Track.findById(trackId);
    if (!track) {
        throw new AppError(t(lang, "auth.unauthorized") , 404);
    }
    return sendSuccess(res, localizeTrack(track.toObject(), lang), t(lang, "track.trackDetails"), 201);
});

/**
 * Update track
 * PATCH /v1/tracks/:id
 * Admin only
 * */
export const updateTrack = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const trackId = Array.isArray(req.params.trackId)
    ? req.params.trackId[0]
    : req.params.trackId;
    
    if (req.body.title && !req.body.titleAr) {
      req.body.titleAr = req.body.title;
    }
    if (req.body.description && !req.body.descriptionAr) {
      req.body.descriptionAr = req.body.description;
    }

    // console.log('req.body:', req.body);
    const track = await Track.findByIdAndUpdate(trackId, req.body, { new: true });
    if (!track) {
         throw new AppError(t(lang, "auth.unauthorized"), 404);
    }

    return sendSuccess(res, localizeTrack(track.toObject(), lang), t(lang, "track.updated"), 201);
});

/**
 * Delete track
 * DELETE /v1/tracks/:id
 * Admin only
 * */
export const deleteTrack = asyncHandler(async (req: AuthRequest, res: Response) => {
    const lang = ((req as any).lang || 'en') as SupportedLanguage;
    const trackId = Array.isArray(req.params.id)
    ? req.params.id[0]
    : req.params.id;

    const track = await Track.findByIdAndDelete(trackId);
    if (!track) {
            throw new AppError(t(lang, "auth.unauthorized"), 404);
    }
    return sendSuccess(res, null, t(lang, "track.deleted"), 201);
});


/**
 * Disable track
 * Disable /v1/tracks/:id
 * Admin only
 * */
export const disableTrack = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const supportedLang = ((req as any).lang || 'en') as SupportedLanguage;
    const { trackId } = req.params;

    const track = await Track.findByIdAndUpdate(
      trackId,
      { status: 'disabled' },
      { new: true }
    );

    if (!track) {
      throw new AppError(t(supportedLang, "auth.unauthorized"), 404);
    }

    return sendSuccess(res, localizeTrack(track.toObject(), supportedLang), t(supportedLang, "track.disabled"), 200);
  }
);

/**
 * Enable track
 * Enable /v1/tracks/:id
 * Admin only
 * */

export const enableTrack = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const lang = ((req as any).lang || 'en') as SupportedLanguage;
    const { trackId } = req.params;

    const track = await Track.findByIdAndUpdate(
      trackId,
      { status: 'active' },
      { new: true }
    );

    if (!track) {
      throw new AppError(t(lang, "auth.unauthorized"), 404);
    }

    return sendSuccess(res, localizeTrack(track.toObject(), lang), t(lang, "track.enabled"), 200);
  }
);


/**
 * Track realted events resuts
 * */
export const getTrackResults = asyncHandler(async (req: Request, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;

  const trackIdParam = Array.isArray(req.params.trackId)
    ? req.params.trackId[0]
    : req.params.trackId;

    if (!mongoose.Types.ObjectId.isValid(trackIdParam)) {
        throw new AppError(t(lang, "track.not_found"), 400);
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


  sendSuccess(res, results, t(lang, "track.trackResult"), 200);
});


/**
 * Track related community photos for an event
 * */
export const trackCommunityPhotos = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const trackIdParam = Array.isArray(req.params.trackId)
    ? req.params.trackId[0]
    : req.params.trackId;
    if (!mongoose.Types.ObjectId.isValid(trackIdParam)) {
        throw new AppError(t(lang, "track.not_found"), 400);
      }

  const eventIdParam = Array.isArray(req.params.eventId)
    ? req.params.eventId[0]
    : req.params.eventId;
    if (!mongoose.Types.ObjectId.isValid(eventIdParam)) {
        throw new AppError(t(lang, "event.not_found"), 400);
      }

  const communityIdParam = Array.isArray(req.params.Id)
    ? req.params.Id[0]
    : req.params.Id;
    if (!mongoose.Types.ObjectId.isValid(communityIdParam)) {
        throw new AppError(t(lang, "community.not_found"), 400);
      }

  const photos = await Event.findOne({
    _id: new mongoose.Types.ObjectId(eventIdParam),
    trackId: new mongoose.Types.ObjectId(trackIdParam),
    communityId: new mongoose.Types.ObjectId(communityIdParam),
  }).select('communityPhotos');

  sendSuccess(res, photos, t(lang, "community.community_photos"), 200);

});

/**
 * Track related community results for an event
 * */

export const trackCommunityResults = asyncHandler(async (req: AuthRequest, res: Response) => {
  
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const trackIdParam = Array.isArray(req.params.trackId)
    ? req.params.trackId[0]
    : req.params.trackId;

    if (!mongoose.Types.ObjectId.isValid(trackIdParam)) {
        throw new AppError(t(lang, "track.not_found"), 400);
      } 

  const results = await Community.aggregate([
  {
    $match: {
      trackId: { $elemMatch: { $eq: new mongoose.Types.ObjectId(trackIdParam) } }
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'createdBy',
      foreignField: '_id',
      as: 'user',
    },
  },
]);

    sendSuccess(res, results, t(lang, "track.communityResult"), 200);

});

export const archiveTrack = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const supportedLang = ((req as any).lang || 'en') as SupportedLanguage;
    // console.log('archive-params',req.params);
    const { trackId } = req.params;
    const track = await Track.findByIdAndUpdate(
      trackId,
      { status: 'archived' },
      { new: true }
    );

    if (!track) {
      throw new AppError(t(supportedLang, "track.not_found"), 404);
    }

    return sendSuccess(res, localizeTrack(track.toObject(), supportedLang), t(supportedLang, "track.archived"), 200);
  }
);

export const deleteGalleryImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  try {
    const { trackId } = req.params;
    const { imageUrl } = req.body;

    const track = await Track.findById(trackId);
    if (!track) {
      return res.status(404).json({ message: t(lang, "track.not_found") });
    }

    if (!imageUrl) {
      throw new AppError(t(lang, "image.required"), 400);
    }

    if (!track.galleryImages || track.galleryImages.length === 0) {
      throw new AppError(t(lang, "image.not_found"), 400);
    }

    track.galleryImages = track.galleryImages.filter(
      (img) => img !== imageUrl
    );

    await track.save();

    res.status(200).json({
      success: true,
      message: t(lang, "image.delted"),
      galleryImages: track.galleryImages,
    });
    return;

  } catch (error) {
    res.status(500).json({ message: "Server error" });
    return;
  }
});

