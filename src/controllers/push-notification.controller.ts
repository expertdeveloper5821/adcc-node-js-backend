import { Response } from 'express';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import User from '@/models/user.model';
import PushNotificationCampaign from '@/models/push-notification-campaign.model';
import AdminInboxNotification from '@/models/admin-inbox-notification.model';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { sendSuccess } from '@/utils/response';
import { AuthRequest } from '@/middleware/auth.middleware';
import {
  createAdminInboxForAllAdmins,
  executeCampaignSend,
  isScheduledInFuture,
  parseScheduleToDate,
} from '@/services/push-campaign.service';
import type { PushCampaignStatus } from '@/models/push-notification-campaign.model';

const STAFF_ROLES: Array<'Admin' | 'Vendor' | 'Member'> = ['Vendor'];

const ensureStaff = (role?: string) => {
  if (!role || !STAFF_ROLES.includes(role as 'Admin' | 'Vendor' | 'Member')) {
    throw new AppError('Staff access required', 403);
  }
};

async function runCreateCampaign(req: AuthRequest) {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Unauthorized', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(String(userId))) {
    throw new AppError('Unauthorized', 401);
  }

  const { title, body, url, audienceType, scheduleDate, scheduleTime } = req.body as {
    title: string;
    body: string;
    url?: string;
    audienceType: string;
    scheduleDate?: string;
    scheduleTime?: string;
  };

  const sd = scheduleDate?.trim();
  const st = scheduleTime?.trim();
  const hasSchedule = Boolean(sd && st);

  let scheduledAt: Date;
  let status: PushCampaignStatus;

  if (hasSchedule) {
    scheduledAt = parseScheduleToDate(sd!, st!);
    if (!isScheduledInFuture(scheduledAt)) {
      throw new AppError('Schedule time must be in the future', 400);
    }
    status = 'scheduled';
  } else {
    scheduledAt = new Date();
    status = 'sending';
  }

  const campaign = await PushNotificationCampaign.create({
    title,
    body,
    url,
    audienceType,
    scheduledAt,
    status,
    createdBy: new mongoose.Types.ObjectId(String(userId)),
  });

  if (status === 'scheduled') {
    await createAdminInboxForAllAdmins({
      title: `Campaign scheduled: ${title}`,
      body: `Scheduled for ${dayjs(scheduledAt).format('DD-MM-YYYY HH:mm')}`,
      relatedCampaignId: campaign._id,
    });
    return { campaign, scheduled: true as const };
  }

  await executeCampaignSend(campaign._id);
  const updated = await PushNotificationCampaign.findById(campaign._id);
  return { campaign: updated, scheduled: false as const };
}

/**
 * Register a web push token for the authenticated staff member
 * POST /v1/push-notifications/web/register
 */
export const registerWebPushToken = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    console.log('user', req.user);
    console.log('userRole', req.user?.role);
    // ensureStaff(req.user?.role);

    const { token, userAgent, platform, deviceId, deviceModel, osVersion, appVersion, appBuild } =
      req.body as {
        token: string;
        userAgent?: string;
        platform?: 'web' | 'android' | 'ios';
        deviceId?: string;
        deviceModel?: string;
        osVersion?: string;
        appVersion?: string;
        appBuild?: string;
      };
    const now = new Date();

    const updateExisting = await User.updateOne(
      { _id: userId, 'fcmTokens.token': token },
      {
        $set: {
          'fcmTokens.$.lastSeenAt': now,
          'fcmTokens.$.userAgent': userAgent,
          'fcmTokens.$.platform': platform,
          'fcmTokens.$.deviceId': deviceId,
          'fcmTokens.$.deviceModel': deviceModel,
          'fcmTokens.$.osVersion': osVersion,
          'fcmTokens.$.appVersion': appVersion,
          'fcmTokens.$.appBuild': appBuild,
        },
      }
    );

    if (updateExisting.matchedCount === 0) {
      await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            fcmTokens: {
              token,
              userAgent,
              platform,
              deviceId,
              deviceModel,
              osVersion,
              appVersion,
              appBuild,
              createdAt: now,
              lastSeenAt: now,
            },
          },
        },
        { new: true }
      );
    }

    sendSuccess(res, { token }, 'Web push token registered', 201);
  }
);

/**
 * Unregister a web push token for the authenticated staff member
 * POST /v1/push-notifications/web/unregister
 */
export const unregisterWebPushToken = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }
    ensureStaff(req.user?.role);

    const { token } = req.body as { token: string };

    await User.findByIdAndUpdate(userId, {
      $pull: { fcmTokens: { token } },
    });

    sendSuccess(res, { token }, 'Web push token unregistered');
  }
);

/**
 * Create a push campaign (scheduled or immediate send)
 * POST /v1/push-notifications/campaigns
 */
export const createPushCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await runCreateCampaign(req);

  if (result.scheduled) {
    sendSuccess(res, { campaign: result.campaign }, 'Push campaign scheduled', 201);
    return;
  }

  const c = result.campaign;
  sendSuccess(
    res,
    {
      campaign: c,
      successCount: c?.successCount ?? 0,
      failureCount: c?.failureCount ?? 0,
      invalidTokensRemoved: c?.invalidTokensRemoved ?? 0,
    },
    'Push campaign sent'
  );
});

/**
 * Send a web push notification to all staff members (legacy)
 * POST /v1/push-notifications/web/send-to-staff
 * Admin only — delegates to campaign pipeline
 */
export const sendWebPushToStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { title, body, url, audienceType, scheduleDate, scheduleTime } = req.body as {
    title: string;
    body: string;
    url?: string;
    audienceType: string;
    scheduleDate?: string;
    scheduleTime?: string;
  };

  const result = await runCreateCampaign(req);

  if (result.scheduled) {
    sendSuccess(
      res,
      {
        successCount: 0,
        failureCount: 0,
        invalidTokensRemoved: 0,
        campaign: result.campaign,
        request: {
          title,
          body,
          url: url ?? null,
          audienceType: audienceType ?? null,
          scheduleDate: scheduleDate ?? null,
          scheduleTime: scheduleTime ?? null,
        },
      },
      'Push campaign scheduled',
      201
    );
    return;
  }

  const c = result.campaign;
  sendSuccess(res, {
    successCount: c?.successCount ?? 0,
    failureCount: c?.failureCount ?? 0,
    invalidTokensRemoved: c?.invalidTokensRemoved ?? 0,
    campaign: c,
    request: {
      title,
      body,
      url: url ?? null,
      audienceType: audienceType ?? null,
      scheduleDate: scheduleDate ?? null,
      scheduleTime: scheduleTime ?? null,
    },
  }, 'Staff web push notification sent');
});

/**
 * List push campaigns with status filters (active = scheduled or sending)
 * GET /v1/push-notifications/campaigns
 */
export const listPushCampaigns = asyncHandler(async (req: AuthRequest, res: Response) => {
  const q = req.query as {
    status?: string;
    page?: number;
    limit?: number;
  };
  const status = q.status ?? 'all';
  const page = q.page ?? 1;
  const limit = q.limit ?? 20;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (status === 'active') {
    filter.status = { $in: ['scheduled', 'sending'] };
  } else if (status !== 'all') {
    filter.status = status;
  }

  const [items, total] = await Promise.all([
    PushNotificationCampaign.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'fullName email role')
      .lean(),
    PushNotificationCampaign.countDocuments(filter),
  ]);

  sendSuccess(res, {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

/**
 * GET /v1/push-notifications/campaigns/:id
 */
export const getPushCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const doc = await PushNotificationCampaign.findById(id)
    .populate('createdBy', 'fullName email role')
    .lean();
  if (!doc) {
    throw new AppError('Campaign not found', 404);
  }
  sendSuccess(res, { campaign: doc });
});

/**
 * PATCH /v1/push-notifications/campaigns/:id/cancel
 */
export const cancelPushCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updated = await PushNotificationCampaign.findOneAndUpdate(
    { _id: id, status: 'scheduled' },
    { $set: { status: 'cancelled' as PushCampaignStatus } },
    { new: true }
  );
  if (!updated) {
    throw new AppError('Scheduled campaign not found or already processed', 404);
  }
  sendSuccess(res, { campaign: updated }, 'Campaign cancelled');
});

/**
 * DELETE /v1/push-notifications/campaigns/:id
 */
export const deletePushCampaign = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const deleted = await PushNotificationCampaign.findByIdAndDelete(id);
  if (!deleted) {
    throw new AppError('Campaign not found', 404);
  }
  sendSuccess(res, { id: deleted._id }, 'Campaign deleted');
});

/**
 * Admin header inbox — list notifications for the current admin
 * GET /v1/push-notifications/inbox
 */
export const listAdminInbox = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    throw new AppError('Unauthorized', 401);
  }

  const q = req.query as { page?: number; limit?: number; unreadOnly?: boolean };
  const page = q.page ?? 1;
  const limit = q.limit ?? 30;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    recipientUserId: new mongoose.Types.ObjectId(String(userId)),
  };
  if (q.unreadOnly === true) {
    filter.read = false;
  }

  const [items, total, unreadCount] = await Promise.all([
    AdminInboxNotification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AdminInboxNotification.countDocuments(filter),
    AdminInboxNotification.countDocuments({
      recipientUserId: new mongoose.Types.ObjectId(String(userId)),
      read: false,
    }),
  ]);

  sendSuccess(res, {
    items,
    unreadCount,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

/**
 * PATCH /v1/push-notifications/inbox/:id/read
 */
export const markAdminInboxRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    throw new AppError('Unauthorized', 401);
  }
  const { id } = req.params;

  const updated = await AdminInboxNotification.findOneAndUpdate(
    {
      _id: id,
      recipientUserId: new mongoose.Types.ObjectId(String(userId)),
    },
    { $set: { read: true } },
    { new: true }
  );
  if (!updated) {
    throw new AppError('Notification not found', 404);
  }
  sendSuccess(res, { notification: updated }, 'Marked as read');
});

/**
 * PATCH /v1/push-notifications/inbox/read-all
 */
export const markAllAdminInboxRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    throw new AppError('Unauthorized', 401);
  }

  const result = await AdminInboxNotification.updateMany(
    { recipientUserId: new mongoose.Types.ObjectId(String(userId)), read: false },
    { $set: { read: true } }
  );

  sendSuccess(res, { modifiedCount: result.modifiedCount }, 'All notifications marked as read');
});

/**
 * DELETE /v1/push-notifications/inbox/:id
 */
export const deleteAdminInbox = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  if (!userId || !mongoose.Types.ObjectId.isValid(String(userId))) {
    throw new AppError('Unauthorized', 401);
  }
  const { id } = req.params;

  const deleted = await AdminInboxNotification.findOneAndDelete({
    _id: id,
    recipientUserId: new mongoose.Types.ObjectId(String(userId)),
  });
  if (!deleted) {
    throw new AppError('Notification not found', 404);
  }
  sendSuccess(res, { id: deleted._id }, 'Notification removed');
});
