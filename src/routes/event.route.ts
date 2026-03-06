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
import { isAdmin } from '@/middleware/role.middleware';

const router = express.Router();

// Public routes
router.get('/', authenticate, validate(getEventsQuerySchema), getAllEvents);
router.get('/:id', authenticate, getEventById);
router.post('/:eventId/results', authenticate, getEventResults);
router.get('/:eventId/results',  authenticate, getEventResultsList);
router.post('/:eventId/joinEvent', authenticate, validate(joinEventSchema), joinEvent);
router.post('/:eventId/cancel', authenticate, cancelRegistration);
router.post('/:eventId/add-to-calendar', authenticate, addToCalendar);
router.get('/:eventId/member-status', authenticate, getMemberEventStatus);
router.delete('/:eventId/gallery', authenticate, deleteGalleryImage);


// Admin only routes
router.post('/', authenticate, isAdmin, validate(createEventSchema), createEvent);
router.patch('/:id', authenticate, isAdmin, validate(updateEventSchema), updateEvent);
router.delete('/:id', authenticate, isAdmin, deleteEvent);

export default router;

