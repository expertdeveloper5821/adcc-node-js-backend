import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import mongoose from 'mongoose';
import User from '@/models/user.model';
import PushNotificationCampaign, {
  IPushNotificationCampaign,
  PushCampaignStatus,
} from '@/models/push-notification-campaign.model';
import AdminInboxNotification from '@/models/admin-inbox-notification.model';
import { sendWebPushNotification } from '@/services/firebase.service';
import { AppError } from '@/utils/app-error';

dayjs.extend(customParseFormat);

/** Matches existing staff broadcast in push-notification.controller */
export const STAFF_ROLES: Array<'Admin' | 'Vendor' | 'Member'> = ['Vendor'];

const CHUNK_SIZE = 500;

export function parseScheduleToDate(scheduleDate: string, scheduleTime: string): Date {
  const combined = dayjs(
    `${scheduleDate.trim()} ${scheduleTime.trim()}`,
    'DD-MM-YYYY HH:mm',
    true
  );
  if (!combined.isValid()) {
    throw new AppError(
      'Invalid schedule. Use date as DD-MM-YYYY and time as HH:mm (24h).',
      400
    );
  }
  return combined.toDate();
}

export function isScheduledInFuture(scheduledAt: Date): boolean {
  return scheduledAt.getTime() > Date.now();
}

async function collectTokensForAudience(audienceType: string): Promise<{
  tokens: string[];
  tokenOwners: Map<string, string>;
}> {
  const normalized = audienceType.trim().toLowerCase().replace(/\s+/g, '_');

  const roleFilter =
    normalized === 'all_users' ||
    normalized === 'all' ||
    normalized === 'everyone'
      ? {}
      : { role: { $in: STAFF_ROLES } };

  const users = await User.find(
    {
      ...roleFilter,
      fcmTokens: { $exists: true, $ne: [] },
    },
    { fcmTokens: 1, role: 1 }
  ).lean();

  const tokenOwners = new Map<string, string>();
  const tokens: string[] = [];

  for (const user of users) {
    const userTokens = (user as { fcmTokens?: Array<{ token?: string }> }).fcmTokens || [];
    for (const entry of userTokens) {
      if (entry?.token) {
        tokens.push(entry.token);
        tokenOwners.set(entry.token, user._id.toString());
      }
    }
  }

  return { tokens, tokenOwners };
}

async function removeInvalidTokens(invalidTokensByUser: Map<string, string[]>): Promise<void> {
  if (invalidTokensByUser.size === 0) return;
  const ops = Array.from(invalidTokensByUser.entries()).map(([userId, badTokens]) => ({
    updateOne: {
      filter: { _id: userId },
      update: { $pull: { fcmTokens: { token: { $in: badTokens } } } },
    },
  }));
  await User.bulkWrite(ops, { ordered: false });
}

export async function deliverPushToAudience(
  title: string,
  body: string,
  url: string | undefined,
  audienceType: string
): Promise<{
  successCount: number;
  failureCount: number;
  invalidTokensRemoved: number;
}> {
  const { tokens, tokenOwners } = await collectTokensForAudience(audienceType);

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokensRemoved: 0 };
  }

  let successCount = 0;
  let failureCount = 0;
  const invalidTokensByUser = new Map<string, string[]>();

  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + CHUNK_SIZE);
    const response = await sendWebPushNotification(chunk, { title, body, url });

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((resp, index) => {
      if (!resp.success && resp.error) {
        const code = (resp.error as { code?: string }).code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          const badToken = chunk[index];
          const ownerId = tokenOwners.get(badToken);
          if (ownerId) {
            const list = invalidTokensByUser.get(ownerId) || [];
            list.push(badToken);
            invalidTokensByUser.set(ownerId, list);
          }
        }
      }
    });
  }

  await removeInvalidTokens(invalidTokensByUser);
  const invalidTokensRemoved = Array.from(invalidTokensByUser.values()).reduce(
    (acc, list) => acc + list.length,
    0
  );

  return { successCount, failureCount, invalidTokensRemoved };
}

export async function createAdminInboxForAllAdmins(params: {
  title: string;
  body: string;
  url?: string;
  relatedCampaignId?: mongoose.Types.ObjectId;
}): Promise<void> {
  const admins = await User.find({ role: 'Admin' }).select('_id').lean();
  if (!admins.length) return;

  await AdminInboxNotification.insertMany(
    admins.map((a) => ({
      recipientUserId: a._id,
      title: params.title,
      body: params.body,
      url: params.url,
      read: false,
      relatedCampaignId: params.relatedCampaignId ?? null,
    }))
  );
}

export async function executeCampaignSend(campaignId: mongoose.Types.ObjectId): Promise<void> {
  const campaign = await PushNotificationCampaign.findById(campaignId);
  if (!campaign) return;

  if (campaign.status !== 'sending') {
    return;
  }

  try {
    const result = await deliverPushToAudience(
      campaign.title,
      campaign.body,
      campaign.url,
      campaign.audienceType
    );

    campaign.status = 'completed';
    campaign.sentAt = new Date();
    campaign.successCount = result.successCount;
    campaign.failureCount = result.failureCount;
    campaign.invalidTokensRemoved = result.invalidTokensRemoved;
    campaign.lastError = undefined;
    await campaign.save();

    const summary =
      result.successCount > 0
        ? `Delivered to ${result.successCount} device(s).${result.failureCount ? ` ${result.failureCount} failed.` : ''}`
        : 'No registered devices matched this audience.';

    await createAdminInboxForAllAdmins({
      title: `Push sent: ${campaign.title}`,
      body: summary,
      url: campaign.url,
      relatedCampaignId: campaign._id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Send failed';
    campaign.status = 'failed';
    campaign.lastError = message;
    await campaign.save();

    await createAdminInboxForAllAdmins({
      title: `Push failed: ${campaign.title}`,
      body: message,
      relatedCampaignId: campaign._id,
    });
  }
}

/** Atomically claim one due scheduled campaign and return it, or null */
async function claimNextDueCampaign(): Promise<IPushNotificationCampaign | null> {
  return PushNotificationCampaign.findOneAndUpdate(
    {
      status: 'scheduled',
      scheduledAt: { $lte: new Date() },
    },
    { $set: { status: 'sending' as PushCampaignStatus } },
    { new: true, sort: { scheduledAt: 1 } }
  );
}

export async function processDueScheduledCampaigns(): Promise<void> {
  for (;;) {
    const claimed = await claimNextDueCampaign();
    if (!claimed) break;
    await executeCampaignSend(claimed._id);
  }
}

export function startScheduledPushWorker(intervalMs = 60_000): NodeJS.Timeout {
  const tick = () => {
    processDueScheduledCampaigns().catch((err) =>
      console.error('[push-campaign] processDueScheduledCampaigns', err)
    );
  };
  tick();
  return setInterval(tick, intervalMs);
}
