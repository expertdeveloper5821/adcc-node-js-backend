import express from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireStaffPermission } from '@/middleware/rbac.middleware';
import { getDashboardLanding } from '@/controllers/dashboard.controller';

const router = express.Router();

router.get(
  '/landing',
  authenticate,
  requireStaffPermission('view_dashboard'),
  getDashboardLanding
);

export default router;
