import express from 'express';
import multer from 'multer';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin, authenticatedOnly } from '@/middleware/role.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
  registerWebPushTokenSchema,
  unregisterWebPushTokenSchema,
  sendStaffWebPushSchema,
} from '@/validators/push-notification.validator';
import {
  registerWebPushToken,
  unregisterWebPushToken,
  sendWebPushToStaff,
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

export default router;
