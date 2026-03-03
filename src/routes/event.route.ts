import express from 'express';
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  joinEvent,
  cancelRegistration,
  getEventResults,
  getEventResultsList,
  addToCalendar,
  getMemberEventStatus,
  deleteGalleryImage

} from '@/controllers/event.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  createEventSchema,
  updateEventSchema,
  getEventsQuerySchema,
} from '@/validators/event.validator';
import { 
  joinEventSchema
 } from '@/validators/event-result.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin, requireMember } from '@/middleware/role.middleware';

const router = express.Router();

// Public routes – guest-accessible (no auth required)
router.get('/', validate(getEventsQuerySchema), getAllEvents);
router.get('/:id', getEventById);
router.post('/:eventId/results', authenticate, requireMember, getEventResults);
router.get('/:eventId/results', getEventResultsList);
router.post('/:eventId/joinEvent', authenticate, requireMember, validate(joinEventSchema), joinEvent);
router.post('/:eventId/cancel', authenticate, requireMember, cancelRegistration);
router.post('/:eventId/add-to-calendar', authenticate, requireMember, addToCalendar);
router.get('/:eventId/member-status', authenticate, requireMember, getMemberEventStatus);
router.delete('/:eventId/gallery', authenticate, requireMember, deleteGalleryImage);


// Admin only routes
router.post('/', authenticate, isAdmin, validate(createEventSchema), createEvent);
router.patch('/:id', authenticate, isAdmin, validate(updateEventSchema), updateEvent);
router.delete('/:id', authenticate, isAdmin, deleteEvent);

export default router;

