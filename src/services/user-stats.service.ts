import User from '@/models/user.model';

/** Event categories that count as "rides" for totalRides stat */
export const RIDE_CATEGORIES = [
  'Race',
  'Community Ride',
  'Awareness Rides',
  'Training & Clinics',
];

export function isRideCategory(category: string | undefined): boolean {
  return !!category && RIDE_CATEGORIES.includes(category);
}

/**
 * Increment user stats when they join (or rejoin) an event.
 * Call after creating or updating EventResult to status 'joined'.
 */
export async function incrementStatsOnJoin(
  userId: string,
  isRideCategoryEvent: boolean
): Promise<void> {
  const update: Record<string, number> = {
    'stats.totalEventsParticipated': 1,
  };
  if (isRideCategoryEvent) {
    update['stats.totalRides'] = 1;
  }
  await User.findByIdAndUpdate(userId, { $inc: update });
}

/**
 * Decrement user stats when they cancel event participation.
 * Call after updating EventResult to status 'cancelled'.
 */
export async function decrementStatsOnCancel(
  userId: string,
  isRideCategoryEvent: boolean
): Promise<void> {
  const update: Record<string, number> = {
    'stats.totalEventsParticipated': -1,
  };
  if (isRideCategoryEvent) {
    update['stats.totalRides'] = -1;
  }
  await User.findByIdAndUpdate(userId, { $inc: update });
}

/**
 * Add completed distance to user's total when they submit event result.
 * Call after updating EventResult to status 'completed' with distance.
 */
export async function addDistanceOnComplete(
  userId: string,
  distanceKm: number
): Promise<void> {
  if (distanceKm <= 0) return;
  await User.findByIdAndUpdate(userId, {
    $inc: { 'stats.totalDistanceKm': distanceKm },
  });
}
