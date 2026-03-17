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
  markParticipantCheckedIn,
  markParticipantNoShow,
  removeEventParticipant,
  exportEventResults,
  checkInAllRegisteredParticipants,
  markAllParticipantsNoShow,
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
// import { joinEventSchema } from '@/validators/event-result.validator';
import { requireMultipartFormData, requireParsedMultipartBody } from '@/middleware/upload.middleware';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin} from '@/middleware/role.middleware';
import { uploadMultipleImages, uploadEventImages, uploadEventImagesIfMultipart } from '@/middleware/upload.middleware';

const router = express.Router();


// Public routes – guest-accessible (no auth required)

router.get('/', authenticate, validate(getEventsQuerySchema), getAllEvents);
router.get('/:id', authenticate, getEventById);
router.post('/:eventId/results', authenticate, getEventResults);
router.get('/:eventId/results',  authenticate, getEventResultsList);
router.get('/:eventId/results/export', authenticate, isAdmin, exportEventResults);
router.post('/:eventId/joinEvent', authenticate,  joinEvent);
router.post('/:eventId/cancel', authenticate, cancelRegistration);
router.post('/:eventId/add-to-calendar', authenticate, addToCalendar);
router.get('/:eventId/member-status', authenticate, getMemberEventStatus);
router.post('/:eventId/gallery', authenticate, isAdmin, uploadMultipleImages, addEventGalleryImages);
router.delete('/:eventId/gallery', authenticate, deleteGalleryImage);
router.patch('/:eventId/participants/check-in-all', authenticate, isAdmin, checkInAllRegisteredParticipants);
router.patch('/:eventId/participants/no-show-all', authenticate, isAdmin, markAllParticipantsNoShow);
router.patch('/:eventId/participants/:userId/check-in', authenticate, isAdmin, markParticipantCheckedIn);
router.patch('/:eventId/participants/:userId/no-show', authenticate, isAdmin, markParticipantNoShow);
router.delete('/:eventId/participants/:userId', authenticate, isAdmin, removeEventParticipant);


// Admin only routes

router.post(
  '/',
  authenticate,
  isAdmin,
  uploadEventImagesIfMultipart,
  requireParsedMultipartBody,
  validate(createEventSchema),
  createEvent
);

router.patch('/:id', authenticate, isAdmin, requireMultipartFormData, uploadEventImages, validate(updateEventSchema), updateEvent);
router.delete('/:id', authenticate, isAdmin, deleteEvent);
router.patch('/:eventId/close-registration', authenticate, isAdmin, closeEventRegistration);
router.patch('/:eventId/reopen-registration', authenticate, isAdmin, reopenEventRegistration);
router.patch('/:eventId/complete', authenticate, isAdmin, completeEvent);
router.patch('/:eventId/disable', authenticate, isAdmin, disableEvent);

export default router;
