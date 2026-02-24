import { Request, Response } from 'express';
import Event from '@/models/event.model';
import EventResult from '@/models/eventResult.model';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';
import dayjs from 'dayjs';
import mongoose from 'mongoose';

/**
 * Create new event
 * POST /v1/events
 * Admin only
 */
export const createEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const eventData = {
    ...req.body,
    eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined,
    createdBy: userId,
  };

  const event = await Event.create(eventData);

  sendSuccess(res, event, 'Event created successfully', 201);
});

/**
 * Get all events
 * GET /v1/events
 * Public - with optional filters
 */
export const getAllEvents = asyncHandler(async (req: Request, res: Response) => {
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
    .populate('trackId', 'title')
    .populate('communityId', 'title')
    .sort({ eventDate: 1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Get total count
  const total = await Event.countDocuments(filter);

  sendSuccess(
    res,
    {
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
    'Events retrieved successfully', 201
  );
});

/**
 * Get event by ID
 * GET /v1/events/:id
 * Public
 */
export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const event = await Event.findById(id).populate('createdBy', 'fullName email');

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  sendSuccess(res, event, 'Event retrieved successfully', 201);
});

/**
 * Update event
 * PATCH /v1/events/:id
 * Admin only
 */
export const updateEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // Convert eventDate string to Date if provided
  if (updateData.eventDate) {
    updateData.eventDate = new Date(updateData.eventDate);
  }

  const event = await Event.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate('createdBy', 'fullName email');

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  sendSuccess(res, event, 'Event updated successfully', 201);
});

/**
 * Delete event
 * DELETE /v1/events/:id
 * Admin only
 */
export const deleteEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const event = await Event.findByIdAndDelete(id);

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  sendSuccess(res, null, 'Event deleted successfully', 201);
});

/*
* Status update event results
*/

export const getEventResults = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }
  const eventResults = await EventResult.findOne({ eventId, userId });
  if (!eventResults) {
    throw new AppError('User has not joined this event', 400);
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

  sendSuccess(res, eventResults, 'Event results submitted successfully', 201);
});


/*
* Join Event 
*/
export const joinEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const eventId = Array.isArray(req.params.eventId)
    ? req.params.eventId[0]
    : req.params.eventId;

  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const eventJoin = await EventResult.findOne({
    eventId,
    userId,
  });

  if (eventJoin) {
    if (eventJoin.status === 'joined') {
      throw new AppError('User already joined the event', 400);
    }

    eventJoin.status = 'joined';
    await eventJoin.save();

    return sendSuccess(
      res,
      eventJoin,
      'User successfully rejoined the event',
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
    'User successfully joined the event',
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
  // console.log('paramResponse:', req.params);
  const eventId  = req.params.eventId;
  const reason = req.body.reason || 'No reason provided';
  
  
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!reason || reason.trim().length === 0) {
    throw new AppError('Cancellation reason is required', 400);
  }

  const event = await EventResult.findOne({ eventId, userId });
  if (!event) {
    throw new AppError('User has not joined this event', 400);
  }

  if (event.status === 'cancelled') {
    throw new AppError('Event already cancelled', 400);
  }

  if (event.status === 'completed') {
    throw new AppError('Cannot cancel a completed event', 400);
  }
  event.set({
    reason,
    status: 'cancelled',
  });
  await event.save();

  sendSuccess(res, event, 'Event participation cancelled successfully heree', 201);
});


/**
 * Add to calendar
 * GET /v1/events/:id/add-to-calendar
 **/

 export const addToCalendar = asyncHandler(async (req: AuthRequest, res: Response) => {
  
  console.log('Add to calendar request params:', req.params);
  const eventId = req.params.eventId;
  const userId = req.params.userId;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
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
    &text=${encodeURIComponent(event.title)}
    &dates=${start.format('YYYYMMDDTHHmmss')}Z/${end.format('YYYYMMDDTHHmmss')}Z
    &details=${encodeURIComponent(event.description || '')}
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
  const eventId = req.params.eventId;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  // Check if event exists
  const event = await Event.findById(eventId);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check user's participation status
  const eventResult = await EventResult.findOne({ eventId, userId });

  let status = 'not_joined';
  let participationDetails = null;

  if (eventResult) {
    status = eventResult.status; // 'joined', 'cancelled', 'completed'
    participationDetails = {
      joinedAt: eventResult.createdAt,
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
        title: event.title,
        eventDate: event.eventDate,
        status: event.status,
      }
    },
    'Member event status retrieved successfully',
    200
  );
});
