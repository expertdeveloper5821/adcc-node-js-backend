import User from '@/models/user.model';

/**
 * Increment user stats when they join (or rejoin) an event.
 * Call after creating or updating EventResult to status 'joined'.
 */
export async function incrementStatsOnJoin(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    $inc: { 'stats.totalEventsParticipated': 1 },
  });
}

/**
 * Decrement user stats when they cancel event participation.
 * Call after updating EventResult to status 'cancelled'.
 */
export async function decrementStatsOnCancel(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    $inc: { 'stats.totalEventsParticipated': -1 },
  });
}

/**
 * Add completed distance and increment totalRides if event has a track.
 * Call after updating EventResult to status 'completed' with distance.
 */
export async function addDistanceOnComplete(
  userId: string,
  distanceKm: number,
  hasTrack: boolean
): Promise<void> {
  const inc: Record<string, number> = {};
  if (distanceKm > 0) {
    inc['stats.totalDistanceKm'] = distanceKm;
  }
  if (hasTrack) {
    inc['stats.totalRides'] = 1;
  }
  if (Object.keys(inc).length > 0) {
    await User.findByIdAndUpdate(userId, { $inc: inc });
  }
}
