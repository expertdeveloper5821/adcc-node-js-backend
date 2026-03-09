import { Request, Response } from 'express';
import { t } from "@/utils/i18n";
import Event from '@/models/event.model';
import EventResult from '@/models/eventResult.model';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';
import dayjs from 'dayjs';
import mongoose from 'mongoose';
import { localizeDocumentFields, SupportedLanguage, localizeEventStatic } from '@/utils/localization';

const EVENT_LOCALIZED_FIELDS = {
  title: 'titleAr',
  description: 'descriptionAr',
  address: 'addressAr',
};

const SCHEDULE_LOCALIZED_FIELDS = {
  title: 'titleAr',
  description: 'descriptionAr',
};

const localizeEventPayload = (event: Record<string, any>, lang: SupportedLanguage) => {
  const localizedEvent = localizeDocumentFields(event, lang, EVENT_LOCALIZED_FIELDS);
  
  // Localize static values
  localizeEventStatic(localizedEvent, lang);

  if (Array.isArray(localizedEvent.schedule)) {
    localizedEvent.schedule = localizedEvent.schedule.map((item: Record<string, any>) =>
      localizeDocumentFields(item, lang, SCHEDULE_LOCALIZED_FIELDS)
    );
  }

  if (localizedEvent.communityId && typeof localizedEvent.communityId === 'object') {
    localizedEvent.communityId = localizeDocumentFields(localizedEvent.communityId, lang, {
      title: 'titleAr',
    });
  }

  if (localizedEvent.trackId && typeof localizedEvent.trackId === 'object') {
    localizedEvent.trackId = localizeDocumentFields(localizedEvent.trackId, lang, {
      title: 'titleAr',
    });
  }

  return localizedEvent;
};

/**
 * Create new event
 * POST /v1/events
 * Admin only
 */
export const createEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }

  const eventData = {
    ...req.body,
    titleAr: req.body.titleAr || req.body.title,
    descriptionAr: req.body.descriptionAr || req.body.description,
    addressAr: req.body.addressAr || req.body.address,
    schedule: Array.isArray(req.body.schedule)
      ? req.body.schedule.map((item: Record<string, any>) => ({
          ...item,
          titleAr: item.titleAr || item.title,
          descriptionAr: item.descriptionAr || item.description,
        }))
      : req.body.schedule,
    eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined,
    createdBy: userId,
  };

  const event = await Event.create(eventData);
  const localizedEvent = localizeEventPayload(event.toObject(), lang);

  sendSuccess(res, localizedEvent, t(lang, "event.created"), 201);
});

/**
 * Get all events
 * GET /v1/events
 * Public - with optional filters
 */
export const getAllEvents = asyncHandler(async (req: Request, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const { status, page = 1, limit = 10 } = req.query;

  // Build filter object
  const filter: any = {};

  if (status) filter.status = status;

  // Pagination
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const eventsQuery = Event.find(filter)
    .populate('createdBy', 'fullName email')
    .populate('trackId', 'title titleAr')
    .populate('communityId', 'title titleAr')
    .sort({ eventDate: 1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // Run list + count in parallel to reduce endpoint latency.
  const [events, total] = await Promise.all([eventsQuery, Event.countDocuments(filter)]);

  const localizedEvents = events.map((event) => localizeEventPayload(event as Record<string, any>, lang));

  sendSuccess(
    res,
    {
      events: localizedEvents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
    t(lang, "event.allEvents"), 201
  );
});

/**
 * Get event by ID
 * GET /v1/events/:id
 * Public
 */
export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const { id } = req.params;

  const event = await Event.findById(id)
    .populate('createdBy', 'fullName email')
    .populate('trackId', 'title titleAr')
    .populate('communityId', 'title titleAr');

  if (!event) {
    throw new AppError(t(lang, "event.not_found"), 404);
  }

  sendSuccess(res, localizeEventPayload(event.toObject(), lang), t(lang, "event.eventDetails"), 201);
});

/**
 * Update event
 * PATCH /v1/events/:id
 * Admin only
 */
export const updateEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const { id } = req.params;
  const updateData = { ...req.body };

  // Convert eventDate string to Date if provided
  if (updateData.eventDate) {
    updateData.eventDate = new Date(updateData.eventDate);
  }

  if (updateData.title && !updateData.titleAr) {
    updateData.titleAr = updateData.title;
  }
  if (updateData.description && !updateData.descriptionAr) {
    updateData.descriptionAr = updateData.description;
  }
  if (updateData.address && !updateData.addressAr) {
    updateData.addressAr = updateData.address;
  }
  if (Array.isArray(updateData.schedule)) {
    updateData.schedule = updateData.schedule.map((item: Record<string, any>) => ({
      ...item,
      titleAr: item.titleAr || item.title,
      descriptionAr: item.descriptionAr || item.description,
    }));
  }

  const event = await Event.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('createdBy', 'fullName email')
    .populate('trackId', 'title titleAr')
    .populate('communityId', 'title titleAr');

  if (!event) {
    throw new AppError(t(lang, "event.not_found"), 404);
  }

  sendSuccess(res, localizeEventPayload(event.toObject(), lang), t(lang, "event.updated"), 201);
});

/**
 * Delete event
 * DELETE /v1/events/:id
 * Admin only
 */
export const deleteEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const { id } = req.params;

  const event = await Event.findByIdAndDelete(id);

  if (!event) {
    throw new AppError(t(lang, "event.not_found"), 404);
  }

  sendSuccess(res, null, t(lang, "event.deleted"), 201);
});

/*
* Status update event results
*/

export const getEventResults = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const { eventId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }
  const eventResults = await EventResult.findOne({ eventId, userId });
  if (!eventResults) {
    throw new AppError(t(lang, "event.not_member"), 400);
  }

  if (eventResults.time) {
    throw new AppError('Result already submitted', 400);
  }
  eventResults.set({
    distance: req.body.distance,
    time: req.body.time,
    status: 'completed',
  });

  await eventResults.save();

  sendSuccess(res, eventResults, t(lang, "event.submitted"), 201);
});


/*
* Join Event 
*/
export const joinEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId = Array.isArray(req.params.eventId)
    ? req.params.eventId[0]
    : req.params.eventId;

  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError(t(lang, "event.not_found"), 404);
  }

  const eventJoin = await EventResult.findOne({
    eventId,
    userId,
  });

  if (eventJoin) {
    if (eventJoin.status === 'joined') {
      throw new AppError(t(lang, "event.already_joined"), 400);
    }

    eventJoin.status = 'joined';
    await eventJoin.save();

    return sendSuccess(
      res,
      eventJoin,
      t(lang, "event.rejoinEvent"),
      200
    );
  }

  const eventData = await EventResult.create({
    eventId,
    userId,
    status: 'joined',
  });

  return sendSuccess(
    res,
    eventData,
    t(lang, "event.joinEvent"),
    201
  );
});


/*
* Get event results list
*/

export const getEventResultsList = asyncHandler(async (req: Request, res: Response) => {
  
  const eventIdParam = Array.isArray(req.params.eventId)
    ? req.params.eventId[0]
    : req.params.eventId;
  // console.log('body',req.params);
  if (!mongoose.Types.ObjectId.isValid(eventIdParam)) {
    throw new AppError('Invalid eventId', 400);
  }

  const eventResults = await EventResult.aggregate([
  {
    $match: {
      eventId: new mongoose.Types.ObjectId(eventIdParam),
    },
  },
    {
      $addFields: {
        eventTimeInSeconds: {
          $cond: {
            if: { $and: [{ $ne: ["$time", null] }, { $ne: ["$time", ""] }] },
            then: {
              $add: [
                {
                  $multiply: [
                    {
                      $convert: {
                        input: { $substr: ["$time", 0, 2] },
                        to: "int",
                        onError: 0,
                        onNull: 0
                      }
                    },
                    3600
                  ]
                },
                {
                  $multiply: [
                    {
                      $convert: {
                        input: { $substr: ["$time", 3, 2] },
                        to: "int",
                        onError: 0,
                        onNull: 0
                      }
                    },
                    60
                  ]
                }
              ]
            },
            else: 0
          }
        }
      }
    },
  { $sort: { eventTimeInSeconds: 1 } },
  {
    $setWindowFields: {
      sortBy: { eventTimeInSeconds: 1 },
      output: {
        rank: {
          $rank: {},
        },
      },
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
  { $unwind: '$user' },
  {
    $lookup: {
      from: 'events',
      localField: 'eventId',
      foreignField: '_id',
      as: 'event',
    },
  },
  // { $unwind: '$event' },
  {
    $unwind: {  
      path: '$event',
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $project: {
      distance: 1,
      time: 1,
      rank: 1,
      createdAt: 1,
      'user._id': 1,
      'user.fullName': 1,
      'user.email': 1,
      'event._id': 1,
      'event.title': 1,
      'event.eventDate': 1,
    },
  },
]);


  sendSuccess(res, eventResults, 'Event results retrieved successfully', 201);
});

/**
 * Cancel event participation
 */
export const cancelRegistration = asyncHandler(async (req: AuthRequest, res: Response) => {
  // console.log('bodyResponse:', req.body);
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId  = req.params.eventId;
  const reason = req.body.reason || 'No reason provided';
  
  
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }

  if (!reason || reason.trim().length === 0) {
    throw new AppError(t(lang, "event.reason_required"), 400);
  }

  const event = await EventResult.findOne({ eventId, userId });
  if (!event) {
    throw new AppError(t(lang, "event.not_member"), 400);
  }

  if (event.status === 'cancelled') {
    throw new AppError(t(lang, "event.cancelledEvent"), 400);
  }

  if (event.status === 'completed') {
    throw new AppError(t(lang, "event.completed"), 400);
  }
  event.set({
    reason,
    status: 'cancelled',
  });
  await event.save();

  sendSuccess(res, event, t(lang, "event.participationCancelled"), 201);
});


/**
 * Add to calendar
 * GET /v1/events/:id/add-to-calendar
 **/

 export const addToCalendar = asyncHandler(async (req: AuthRequest, res: Response) => {
  
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId = req.params.eventId;
  const userId = req.params.userId;

  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }

  const event = await Event.findById(eventId);
  if (!event) throw new AppError('Event not found', 404);

  // Optional: only allow joined users
  if (userId) {
    const joined = await EventResult.findOne({
      eventId,
      userId: userId,
      status: 'joined',
    });

    if (!joined) {
      throw new AppError('User has not joined this event', 403);
    }
  }

  const start = dayjs(event.eventDate);
  const end = start.add(event.distance || 60);

  // Google Calendar URL
  const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE
    &text=${encodeURIComponent(lang === 'ar' ? event.titleAr || event.title : event.title)}
    &dates=${start.format('YYYYMMDDTHHmmss')}Z/${end.format('YYYYMMDDTHHmmss')}Z
    &details=${encodeURIComponent(lang === 'ar' ? event.descriptionAr || event.description || '' : event.description || '')}
  `.replace(/\s+/g, '');

  sendSuccess(
    res,
    { googleCalendarUrl },
    'Calendar link generated',
    200
  );
});

/**
 * Get member event status
 * GET /v1/events/:eventId/member-status
 * Returns whether the authenticated user has joined the event and their status
 */
export const getMemberEventStatus = asyncHandler(async (req: AuthRequest, res: Response) => {

  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId = req.params.eventId;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError(t(lang, "auth.unauthorized"), 401);
  }

  // Check if event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError(t(lang, "event.not_found"), 404);
  }

  // Check user's participation status
  const eventResult = await EventResult.findOne({ eventId, userId });

  let status = "not_joined";
  let participationDetails = null;

  if (eventResult) {
    status = eventResult.status; // 'joined', 'cancelled', 'completed'
    participationDetails = {
      joinedAt: eventResult.createdAt?.toISOString(),
      status: eventResult.status,
      distance: eventResult.distance,
      time: eventResult.time,
      reason: eventResult.reason,
    };
  }

  sendSuccess(
    res,
    {
      eventId,
      userId,
      status,
      participationDetails,
      event: {
        title: lang === 'ar' ? event.titleAr || event.title : event.title,
        eventDate: event.eventDate,
        status: event.status,
      }
    },
    t(lang, "event.status_retrieved"),
    200
  );
});


export const deleteGalleryImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const lang = ((req as any).lang || 'en') as SupportedLanguage;
    const { eventId } = req.params;
    const { imageUrl } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: t(lang, "event.not_found") });
    }

    if (!imageUrl) {
      throw new AppError(t(lang, "image.required"), 400);
    }

    if (!event.galleryImages || event.galleryImages.length === 0) {
      throw new AppError(t(lang, "image.not_found"), 400);
    }
    
    event.galleryImages = event.galleryImages.filter(
      (img) => img !== imageUrl
    );

    await event.save();

    res.status(200).json({
      success: true,
      message: t(lang, "image.delted"),
      galleryImages: event.galleryImages,
    });
    return;

  } catch (error) {
    res.status(500).json({ message: "Server error" });
    return;
  }
});
