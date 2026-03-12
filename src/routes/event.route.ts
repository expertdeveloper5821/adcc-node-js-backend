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
  deleteGalleryImage,
  addEventGalleryImages,
  closeEventRegistration,
  reopenEventRegistration,
  completeEvent,
  disableEvent

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
import { requireMultipartFormData } from '@/middleware/upload.middleware';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin} from '@/middleware/role.middleware';
import { uploadMultipleImages, uploadEventImages } from '@/middleware/upload.middleware';

const router = express.Router();


// Public routes – guest-accessible (no auth required)

router.get('/', authenticate, validate(getEventsQuerySchema), getAllEvents);
router.get('/:id', authenticate, getEventById);
router.post('/:eventId/results', authenticate, getEventResults);
router.get('/:eventId/results',  authenticate, getEventResultsList);
router.post('/:eventId/joinEvent', authenticate, validate(joinEventSchema), joinEvent);
router.post('/:eventId/cancel', authenticate, cancelRegistration);
router.post('/:eventId/add-to-calendar', authenticate, addToCalendar);
router.get('/:eventId/member-status', authenticate, getMemberEventStatus);
router.post('/:eventId/gallery', authenticate, isAdmin, uploadMultipleImages, addEventGalleryImages);
router.delete('/:eventId/gallery', authenticate, deleteGalleryImage);


// Admin only routes
router.post('/', authenticate, isAdmin, requireMultipartFormData, uploadEventImages, validate(createEventSchema), createEvent);
router.patch('/:id', authenticate, isAdmin, requireMultipartFormData, uploadEventImages, validate(updateEventSchema), updateEvent);
router.delete('/:id', authenticate, isAdmin, deleteEvent);
router.patch('/:eventId/close-registration', authenticate, isAdmin, closeEventRegistration);
router.patch('/:eventId/reopen-registration', authenticate, isAdmin, reopenEventRegistration);
router.patch('/:eventId/complete', authenticate, isAdmin, completeEvent);
router.patch('/:eventId/disable', authenticate, isAdmin, disableEvent);

export default router;

