import express from 'express';
import {
  createStoreItem,
  getStoreItems,
  getStoreItemById,
  updateStoreItem,
  archiveStoreItem,
  approveStoreItem,
  rejectStoreItem,
  featureStoreItem,
  markStoreItemSold,
  getMyStoreItems,
  getAdminStoreItems,
} from '@/controllers/store.controller';
import { validate } from '@/middleware/validate.middleware';
import {
  createStoreItemSchema,
  updateStoreItemSchema,
  storeItemQuerySchema,
  approveStoreItemSchema,
  rejectStoreItemSchema,
  featureStoreItemSchema,
} from '@/validators/store.validator';
import { authenticate } from '@/middleware/auth.middleware';
import { authenticatedOnly, isAdmin } from '@/middleware/role.middleware';

const router = express.Router();

// Public (guest-accessible with token)
router.get('/items', authenticate, validate(storeItemQuerySchema), getStoreItems);
router.get('/items/:id', authenticate, getStoreItemById);

// Member/Staff
router.post('/items', authenticate, authenticatedOnly, validate(createStoreItemSchema), createStoreItem);
router.get('/my-items', authenticate, authenticatedOnly, getMyStoreItems);
router.patch('/items/:id', authenticate, authenticatedOnly, validate(updateStoreItemSchema), updateStoreItem);
router.delete('/items/:id', authenticate, authenticatedOnly, archiveStoreItem);
router.post('/items/:id/sold', authenticate, authenticatedOnly, markStoreItemSold);

// Admin moderation
router.get('/admin/items', authenticate, isAdmin, validate(storeItemQuerySchema), getAdminStoreItems);
router.post('/items/:id/approve', authenticate, isAdmin, validate(approveStoreItemSchema), approveStoreItem);
router.post('/items/:id/reject', authenticate, isAdmin, validate(rejectStoreItemSchema), rejectStoreItem);
router.post('/items/:id/feature', authenticate, isAdmin, validate(featureStoreItemSchema), featureStoreItem);

export default router;
