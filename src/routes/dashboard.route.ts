import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireStaffPermission } from '@/middleware/rbac.middleware';
import { validate } from '@/middleware/validate.middleware';
import { getStaffDashboardSummary } from '@/controllers/dashboard.controller';
import { staffDashboardQuerySchema } from '@/validators/dashboard.validator';

const router = Router();

router.get(
  '/summary',
  authenticate,
  requireStaffPermission('view_dashboard'),
  validate(staffDashboardQuerySchema),
  getStaffDashboardSummary
);

export default router;
