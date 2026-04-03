import { Response } from 'express';
import { AuthRequest } from '@/middleware/auth.middleware';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { t } from '@/utils/i18n';
import { getEffectivePermissionKeys } from '@/services/rbac.service';
import {
  BannerGroupQuery,
  canSeeAdminOverview,
  canSeeCommunity,
  canSeeContent,
  canSeeModeration,
  fetchAdminOverviewMetrics,
  fetchCommunityMetrics,
  fetchContentMetrics,
  fetchModerationMetrics,
} from '@/services/dashboard.service';
import type { StaffDashboardQuery } from '@/validators/dashboard.validator';

/**
 * Staff dashboard: one response, sections filled from RBAC (community-manager, moderator, admin, etc.).
 * GET /v1/dashboard/summary
 */
export const getStaffDashboardSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = (((req as any).lang || 'en') as string) ?? 'en';
  const userId = req.user?.id;

  if (!userId || req.user?.isGuest) {
    throw new AppError(t(lang, 'auth.unauthorized'), 401);
  }

  const keys = await getEffectivePermissionKeys(userId);
  const q = req.query as unknown as StaffDashboardQuery & BannerGroupQuery;

  const [content, community, moderation, admin] = await Promise.all([
    canSeeContent(keys) ? fetchContentMetrics(q) : Promise.resolve(undefined),
    canSeeCommunity(keys) ? fetchCommunityMetrics(q) : Promise.resolve(undefined),
    canSeeModeration(keys) ? fetchModerationMetrics(keys, q) : Promise.resolve(undefined),
    canSeeAdminOverview(keys) ? fetchAdminOverviewMetrics() : Promise.resolve(undefined),
  ]);

  const sections: Record<string, unknown> = {};
  if (content !== undefined) sections.content = content;
  if (community !== undefined) sections.community = community;
  if (moderation !== undefined) sections.moderation = moderation;
  if (admin !== undefined) sections.admin = admin;

  sendSuccess(
    res,
    {
      permissionKeys: [...keys].sort(),
      sections,
    },
    t(lang, 'dashboard.summary'),
    200
  );
});
