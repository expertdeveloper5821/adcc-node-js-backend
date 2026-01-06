import { Request, Response } from 'express';
import Event from '@/models/event.model';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';

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
  const { category, eventType, status, page = 1, limit = 10 } = req.query;

  // Build filter object
  const filter: any = {};

  if (category) filter.category = category;
  if (eventType) filter.eventType = eventType;
  if (status) filter.status = status;

  // Pagination
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get events
  const events = await Event.find(filter)
    .populate('createdBy', 'fullName email')
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
    'Events retrieved successfully'
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

  sendSuccess(res, event, 'Event retrieved successfully');
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

  sendSuccess(res, event, 'Event updated successfully');
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

  sendSuccess(res, null, 'Event deleted successfully');
});

