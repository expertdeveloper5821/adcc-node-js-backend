import { Request, Response } from 'express';
import { t } from "@/utils/i18n";
import Event from '@/models/event.model';
import EventResult from '@/models/eventResult.model';
import User from '@/models/user.model';
import {
  adminSaveResultsSchema,
  bulkParticipantActionSchema,
  participantListQuerySchema,
  ParticipantStatusInput,
} from '@/validators/event-result.validator';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';
import dayjs from 'dayjs';
import mongoose from 'mongoose';
import { localizeDocumentFields, SupportedLanguage, localizeEventStatic } from '@/utils/localization';
import { rankResultsForLeaderboard } from '@/utils/event-results.util';

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

const parseTimeToSeconds = (value?: string | null): number | null => {
  if (!value) return null;

  const segments = value.split(':').map((segment) => Number(segment));
  if (segments.some((segment) => Number.isNaN(segment) || segment < 0)) {
    return null;
  }

  if (segments.length === 3) {
    const [hours, minutes, seconds] = segments;
    return (hours * 3600) + (minutes * 60) + seconds;
  }

  if (segments.length === 2) {
    const [minutes, seconds] = segments;
    return (minutes * 60) + seconds;
  }

  return null;
};


const toObjectId = (value: string, fieldName: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }

  return new mongoose.Types.ObjectId(value);
};

const formatCsvValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  const raw = String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
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
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get events
  const events = await Event.find(filter)
    .populate('createdBy', 'fullName email')
    .populate('trackId', 'title titleAr')
    .populate('communityId', 'title titleAr')
    .sort({ eventDate: 1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Get total count
  const total = await Event.countDocuments(filter);

  const localizedEvents = events.map((event) => localizeEventPayload(event.toObject(), lang));

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

  if (eventResults.status === 'no_show') {
    throw new AppError('No-show member cannot submit result', 400);
  }

  eventResults.set({
    distance: req.body.distance,
    time: req.body.time,
    status: 'completed',
    completedAt: new Date(),
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
    if (['joined', 'checked_in', 'completed'].includes(eventJoin.status)) {
      throw new AppError(t(lang, "event.already_joined"), 400);
    }

    eventJoin.set({
      status: 'joined',
      checkedInAt: null,
      noShowAt: null,
      reason: null,
    });
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

export const getEventResultsList = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  
  const eventIdParam = Array.isArray(req.params.eventId)
    ? req.params.eventId[0]
    : req.params.eventId;
  // console.log('body',req.params);
  if (!mongoose.Types.ObjectId.isValid(eventIdParam)) {
    throw new AppError('Invalid eventId', 400);
  }

  const event = await Event.findById(eventIdParam).select('status resultsPublished').lean();
  if (!event) {
    throw new AppError(t(lang, 'event.not_found'), 404);
  }

  let isAdmin = false;
  const requesterId = req.user?.id;

  if (requesterId && !req.user?.isGuest) {
    const requester = await User.findById(requesterId).select('role').lean();
    isAdmin = requester?.role === 'Admin';
  }

  const isPublished = Boolean((event as any).resultsPublished) || event.status === 'Completed';
  if (!isPublished && !isAdmin) {
    throw new AppError(t(lang, 'event.results_not_published'), 403);
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
 * Admin bulk save results for event participants
 * POST /v1/events/:eventId/admin/results/save
 */
export const saveAdminEventResults = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
  const eventObjectId = toObjectId(eventId, 'eventId');

  const parsedBody = adminSaveResultsSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    const formattedErrors = parsedBody.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new AppError(JSON.stringify(formattedErrors, null, 2), 400);
  }

  const event = await Event.findById(eventObjectId).lean();
  if (!event) {
    throw new AppError(t(lang, 'event.not_found'), 404);
  }

  const ranked = rankResultsForLeaderboard(parsedBody.data.results);
  const userIds = ranked.map((item) => item.userId);
  const userObjectIds = userIds.map((id) => toObjectId(id, 'userId'));
  const participants = await EventResult.find({
    eventId: eventObjectId,
    userId: { $in: userObjectIds },
  });

  if (participants.length !== userIds.length) {
    throw new AppError(t(lang, 'event.not_member'), 400);
  }

  const participantByUserId = new Map<string, (typeof participants)[number]>();
  for (const participant of participants) {
    participantByUserId.set(String(participant.userId), participant);
  }

  const now = new Date();
  const updatedParticipants = await Promise.all(
    ranked.map(async (entry) => {
      const participant = participantByUserId.get(entry.userId);
      if (!participant) {
        throw new AppError(t(lang, 'event.not_member'), 400);
      }

      if (participant.status === 'cancelled' || participant.status === 'no_show') {
        throw new AppError(`Participant cannot be scored in ${participant.status} status`, 400);
      }

      participant.set({
        status: 'completed',
        time: entry.time,
        distance: entry.distance ?? participant.distance,
        rank: entry.rank,
        pointsEarned: entry.pointsEarned,
        badge: entry.badge,
        completedAt: now,
        checkedInAt: participant.checkedInAt || now,
        noShowAt: null,
      });

      await participant.save();
      return participant;
    })
  );

  return sendSuccess(
    res,
    {
      eventId,
      savedCount: updatedParticipants.length,
      leaderboard: ranked.slice(0, 10),
    },
    t(lang, 'event.results_saved'),
    200
  );
});

/**
 * Admin publish event results
 * POST /v1/events/:eventId/admin/results/publish
 */
export const publishAdminEventResults = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
  const eventObjectId = toObjectId(eventId, 'eventId');

  const event = await Event.findById(eventObjectId);
  if (!event) {
    throw new AppError(t(lang, 'event.not_found'), 404);
  }

  const completedParticipants = await EventResult.find({
    eventId: eventObjectId,
    status: 'completed',
    time: { $ne: null },
  });

  if (completedParticipants.length === 0) {
    throw new AppError(t(lang, 'event.results_required_for_publish'), 400);
  }

  const resultsPayload = completedParticipants.map((participant) => ({
    userId: String(participant.userId),
    time: participant.time,
    distance: participant.distance ?? undefined,
  }));

  const ranked = rankResultsForLeaderboard(resultsPayload);
  const rankedByUserId = new Map(ranked.map((entry) => [entry.userId, entry]));
  const now = new Date();

  await Promise.all(
    completedParticipants.map(async (participant) => {
      const userId = String(participant.userId);
      const rankedEntry = rankedByUserId.get(userId);
      if (!rankedEntry) return;

      participant.set({
        rank: rankedEntry.rank,
        pointsEarned: rankedEntry.pointsEarned,
        badge: rankedEntry.badge,
        completedAt: participant.completedAt || now,
        checkedInAt: participant.checkedInAt || now,
      });

      await participant.save();
    })
  );

  event.status = 'Completed';
  (event as any).resultsPublished = true;
  (event as any).resultsPublishedAt = now;
  await event.save();

  return sendSuccess(
    res,
    {
      eventId,
      publishedAt: now,
      completedParticipants: completedParticipants.length,
      leaderboard: ranked.slice(0, 10),
    },
    t(lang, 'event.results_published'),
    200
  );
});

const getEventParticipantsSnapshot = async (eventId: string) => {
  const eventObjectId = toObjectId(eventId, 'eventId');

  const event = await Event.findById(eventObjectId).populate('communityId', 'title titleAr').lean();
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const rawParticipants = await EventResult.find({ eventId: eventObjectId })
    .populate('userId', 'fullName email')
    .sort({ createdAt: -1 })
    .lean();

  const completedWithTime = rawParticipants
    .map((participant) => ({
      id: String(participant._id),
      seconds: parseTimeToSeconds(participant.time),
    }))
    .filter((participant) => participant.seconds !== null)
    .sort((a, b) => (a.seconds as number) - (b.seconds as number));

  const rankByParticipantId: Record<string, number> = {};
  let currentRank = 0;
  let previousSeconds: number | null = null;

  for (const participant of completedWithTime) {
    if (previousSeconds === null || participant.seconds !== previousSeconds) {
      currentRank += 1;
      previousSeconds = participant.seconds as number;
    }
    rankByParticipantId[participant.id] = currentRank;
  }

  const communityDetails = event.communityId as { title?: string; titleAr?: string } | null;
  const communityName = communityDetails?.title || '';
  const communityNameAr = communityDetails?.titleAr || communityName;

  const participants = rawParticipants.map((participant) => {
    const user = participant.userId as { _id: mongoose.Types.ObjectId; fullName?: string; email?: string } | null;
    const participantId = String(participant._id);

    return {
      participantId,
      userId: user?._id ? String(user._id) : '',
      name: user?.fullName || '',
      email: user?.email || '',
      status: participant.status,
      registeredAt: participant.createdAt ?? null,
      checkedInAt: participant.checkedInAt ?? null,
      noShowAt: participant.noShowAt ?? null,
      completedAt: participant.completedAt ?? null,
      distance: participant.distance ?? null,
      time: participant.time ?? null,
      rank: participant.status === 'completed' ? rankByParticipantId[participantId] ?? null : null,
      reason: participant.reason ?? null,
      community: communityName,
      communityAr: communityNameAr,
    };
  });

  const summary = {
    total: participants.length,
    registered: participants.filter((participant) => participant.status === 'joined').length,
    checkedIn: participants.filter((participant) => participant.status === 'checked_in').length,
    completed: participants.filter((participant) => participant.status === 'completed').length,
    noShow: participants.filter((participant) => participant.status === 'no_show').length,
    cancelled: participants.filter((participant) => participant.status === 'cancelled').length,
  };

  return { event, participants, summary };
};

/**
 * Admin participant management list
 * GET /v1/events/:eventId/participants
 */
export const getEventParticipants = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
  const parsedQuery = participantListQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    const formattedErrors = parsedQuery.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new AppError(JSON.stringify(formattedErrors, null, 2), 400);
  }

  const { search, status, page = 1, limit = 10 } = parsedQuery.data;
  const { event, participants, summary } = await getEventParticipantsSnapshot(eventId);
  const loweredSearch = search?.toLowerCase().trim();

  const filteredParticipants = participants.filter((participant) => {
    if (status && participant.status !== status) {
      return false;
    }

    if (!loweredSearch) {
      return true;
    }

    return [participant.name, participant.email, participant.community].some((value) =>
      value.toLowerCase().includes(loweredSearch)
    );
  });

  const pageNumber = Math.max(1, Number(page));
  const limitNumber = Math.max(1, Number(limit));
  const skip = (pageNumber - 1) * limitNumber;
  const paginatedParticipants = filteredParticipants.slice(skip, skip + limitNumber);

  return sendSuccess(
    res,
    {
      event: {
        id: String(event._id),
        title: event.title,
        titleAr: event.titleAr || event.title,
        eventDate: event.eventDate,
      },
      summary,
      participants: paginatedParticipants,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: filteredParticipants.length,
        pages: Math.ceil(filteredParticipants.length / limitNumber),
      },
    },
    t(lang, 'event.participants_retrieved'),
    200
  );
});

/**
 * Admin status update for one participant
 * PATCH /v1/events/:eventId/participants/:userId/status
 */
export const updateEventParticipantStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
  const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;

  toObjectId(eventId, 'eventId');
  toObjectId(userId, 'userId');

  const event = await Event.findById(eventId).lean();
  if (!event) {
    throw new AppError(t(lang, 'event.not_found'), 404);
  }

  const eventResult = await EventResult.findOne({ eventId, userId });
  if (!eventResult) {
    throw new AppError(t(lang, 'event.not_member'), 400);
  }

  const payload = req.body as ParticipantStatusInput;

  const updates: Record<string, unknown> = {
    status: payload.status,
  };

  if (payload.status === 'checked_in') {
    updates.checkedInAt = new Date();
    updates.noShowAt = null;
  }

  if (payload.status === 'no_show') {
    updates.noShowAt = new Date();
  }

  if (payload.status === 'completed') {
    updates.completedAt = new Date();
    updates.checkedInAt = eventResult.checkedInAt || new Date();
  }

  if (payload.status === 'joined') {
    updates.checkedInAt = null;
    updates.noShowAt = null;
    updates.completedAt = null;
  }

  if (payload.distance !== undefined) updates.distance = payload.distance;
  if (payload.time !== undefined) updates.time = payload.time;
  if (payload.rank !== undefined) updates.rank = payload.rank;
  if (payload.pointsEarned !== undefined) updates.pointsEarned = payload.pointsEarned;
  if (payload.badge !== undefined) updates.badge = payload.badge;
  if (payload.reason !== undefined) updates.reason = payload.reason;

  eventResult.set(updates);
  await eventResult.save();

  return sendSuccess(res, eventResult, t(lang, 'event.participant_updated'), 200);
});

/**
 * Admin bulk check-in for all registered users
 * POST /v1/events/:eventId/participants/check-in-all
 */
export const bulkCheckInParticipants = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;

  toObjectId(eventId, 'eventId');

  const event = await Event.findById(eventId).lean();
  if (!event) {
    throw new AppError(t(lang, 'event.not_found'), 404);
  }

  const parsedBody = bulkParticipantActionSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    const formattedErrors = parsedBody.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new AppError(JSON.stringify(formattedErrors, null, 2), 400);
  }

  const { userIds } = parsedBody.data;
  const filter: Record<string, unknown> = {
    eventId,
    status: 'joined',
  };

  if (Array.isArray(userIds) && userIds.length > 0) {
    const objectIds = userIds.map((id) => toObjectId(id, 'userId'));
    filter.userId = { $in: objectIds };
  }

  const result = await EventResult.updateMany(filter, {
    $set: {
      status: 'checked_in',
      checkedInAt: new Date(),
      noShowAt: null,
    },
  });

  return sendSuccess(
    res,
    {
      matched: result.matchedCount,
      updated: result.modifiedCount,
    },
    t(lang, 'event.bulk_checkin_success'),
    200
  );
});

/**
 * Admin bulk no-show marking
 * POST /v1/events/:eventId/participants/mark-no-show
 */
export const bulkMarkNoShowParticipants = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;

  toObjectId(eventId, 'eventId');

  const event = await Event.findById(eventId).lean();
  if (!event) {
    throw new AppError(t(lang, 'event.not_found'), 404);
  }

  const parsedBody = bulkParticipantActionSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    const formattedErrors = parsedBody.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new AppError(JSON.stringify(formattedErrors, null, 2), 400);
  }

  const { userIds } = parsedBody.data;
  const filter: Record<string, unknown> = {
    eventId,
    status: { $in: ['joined', 'checked_in'] },
  };

  if (Array.isArray(userIds) && userIds.length > 0) {
    const objectIds = userIds.map((id) => toObjectId(id, 'userId'));
    filter.userId = { $in: objectIds };
  }

  const result = await EventResult.updateMany(filter, {
    $set: {
      status: 'no_show',
      noShowAt: new Date(),
    },
  });

  return sendSuccess(
    res,
    {
      matched: result.matchedCount,
      updated: result.modifiedCount,
    },
    t(lang, 'event.bulk_noshow_success'),
    200
  );
});

/**
 * Export participant list/results as CSV
 * GET /v1/events/:eventId/participants/export-csv
 */
export const exportEventParticipantsCsv = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as SupportedLanguage;
  const eventId = Array.isArray(req.params.eventId) ? req.params.eventId[0] : req.params.eventId;
  const parsedQuery = participantListQuerySchema.safeParse(req.query);

  if (!parsedQuery.success) {
    const formattedErrors = parsedQuery.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    throw new AppError(JSON.stringify(formattedErrors, null, 2), 400);
  }

  const { search, status } = parsedQuery.data;
  const { event, participants } = await getEventParticipantsSnapshot(eventId);
  const loweredSearch = search?.toLowerCase().trim();

  const filteredParticipants = participants.filter((participant) => {
    if (status && participant.status !== status) {
      return false;
    }

    if (!loweredSearch) {
      return true;
    }

    return [participant.name, participant.email, participant.community].some((value) =>
      value.toLowerCase().includes(loweredSearch)
    );
  });

  const csvHeaders = [
    'Name',
    'Email',
    'Community',
    'Status',
    'Registered At',
    'Checked In At',
    'Completed At',
    'Rank',
    'Time',
    'Distance',
  ];

  const csvRows = filteredParticipants.map((participant) => [
    formatCsvValue(participant.name),
    formatCsvValue(participant.email),
    formatCsvValue(lang === 'ar' ? participant.communityAr : participant.community),
    formatCsvValue(participant.status),
    formatCsvValue(participant.registeredAt ? new Date(participant.registeredAt).toISOString() : ''),
    formatCsvValue(participant.checkedInAt ? new Date(participant.checkedInAt).toISOString() : ''),
    formatCsvValue(participant.completedAt ? new Date(participant.completedAt).toISOString() : ''),
    formatCsvValue(participant.rank ?? ''),
    formatCsvValue(participant.time ?? ''),
    formatCsvValue(participant.distance ?? ''),
  ]);

  const csvPayload = [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n');
  const eventSlug = String(event.title || 'event').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const filename = `${eventSlug || 'event'}-${eventId}-participants.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csvPayload);
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
