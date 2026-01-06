import express from 'express';
import {
  createEvent,
  getAllEvents,
  getEventById,
  updateEvent,
  deleteEvent,
} from '@/controllers/event.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  createEventSchema,
  updateEventSchema,
  getEventsQuerySchema,
} from '@/validators/event.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';

const router = express.Router();

// Public routes
router.get('/', validate(getEventsQuerySchema, 'query'), getAllEvents);
router.get('/:id', getEventById);

// Admin only routes
router.post('/', authenticate, isAdmin, validate(createEventSchema), createEvent);
router.patch('/:id', authenticate, isAdmin, validate(updateEventSchema), updateEvent);
router.delete('/:id', authenticate, isAdmin, deleteEvent);

export default router;

