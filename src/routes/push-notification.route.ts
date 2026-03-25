import express from 'express';
import multer from 'multer';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin, authenticatedOnly } from '@/middleware/role.middleware';
import { validate, validateParams } from '@/middleware/validate.middleware';
import {
  registerWebPushTokenSchema,
  unregisterWebPushTokenSchema,
  sendStaffWebPushSchema,
  createCampaignSchema,
  listCampaignsQuerySchema,
  mongoIdParamSchema,
  listInboxQuerySchema,
} from '@/validators/push-notification.validator';
import {
  registerWebPushToken,
  unregisterWebPushToken,
  sendWebPushToStaff,
  createPushCampaign,
  listPushCampaigns,
  getPushCampaign,
  cancelPushCampaign,
  deletePushCampaign,
  listAdminInbox,
  markAdminInboxRead,
  markAllAdminInboxRead,
  deleteAdminInbox,
} from '@/controllers/push-notification.controller';

const router = express.Router();
const upload = multer();

router.post(
  '/web/register',
  authenticate,
  authenticatedOnly,
  upload.none(),
  validate(registerWebPushTokenSchema),
  registerWebPushToken
);

// Platform-agnostic endpoint (web/android/ios)
router.post(
  '/register',
  authenticate,
  authenticatedOnly,
  upload.none(),
  validate(registerWebPushTokenSchema),
  registerWebPushToken
);

router.post(
  '/web/unregister',
  authenticate,
  authenticatedOnly,
  upload.none(),
  validate(unregisterWebPushTokenSchema),
  unregisterWebPushToken
);

// Platform-agnostic endpoint (web/android/ios)
router.post(
  '/unregister',
  authenticate,
  authenticatedOnly,
  upload.none(),
  validate(unregisterWebPushTokenSchema),
  unregisterWebPushToken
);

router.post(
  '/web/send-to-staff',
  authenticate,
  isAdmin,
  upload.none(),
  validate(sendStaffWebPushSchema),
  sendWebPushToStaff
);

router.post(
  '/campaigns',
  authenticate,
  isAdmin,
  upload.none(),
  validate(createCampaignSchema),
  createPushCampaign
);

router.get(
  '/campaigns',
  authenticate,
  isAdmin,
  validate(listCampaignsQuerySchema),
  listPushCampaigns
);

router.get(
  '/campaigns/:id',
  authenticate,
  isAdmin,
  validateParams(mongoIdParamSchema),
  getPushCampaign
);

router.patch(
  '/campaigns/:id/cancel',
  authenticate,
  isAdmin,
  validateParams(mongoIdParamSchema),
  cancelPushCampaign
);

router.delete(
  '/campaigns/:id',
  authenticate,
  isAdmin,
  validateParams(mongoIdParamSchema),
  deletePushCampaign
);

router.get(
  '/inbox',
  authenticate,
  isAdmin,
  validate(listInboxQuerySchema),
  listAdminInbox
);

router.patch(
  '/inbox/read-all',
  authenticate,
  isAdmin,
  markAllAdminInboxRead
);

router.patch(
  '/inbox/:id/read',
  authenticate,
  isAdmin,
  validateParams(mongoIdParamSchema),
  markAdminInboxRead
);

router.delete(
  '/inbox/:id',
  authenticate,
  isAdmin,
  validateParams(mongoIdParamSchema),
  deleteAdminInbox
);

export default router;
