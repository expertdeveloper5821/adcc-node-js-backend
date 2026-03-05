import { AppError } from '@/utils/app-error';

export type ResultDraftInput = {
  userId: string;
  time: string;
  distance?: number;
};

export type RankedResultEntry = {
  userId: string;
  time: string;
  distance?: number;
  seconds: number;
  rank: number;
  pointsEarned: number;
  badge: string | null;
};

type PointRule = {
  maxRank: number;
  points: number;
  badge?: string | null;
};

const DEFAULT_POINT_RULES: PointRule[] = [
  { maxRank: 1, points: 300, badge: 'gold' },
  { maxRank: 2, points: 180, badge: 'silver' },
  { maxRank: 3, points: 120, badge: 'bronze' },
  { maxRank: 10, points: 60, badge: null },
  { maxRank: Number.MAX_SAFE_INTEGER, points: 30, badge: null },
];

const parsePointRules = (): PointRule[] => {
  const raw = process.env.EVENT_POINTS_RULES;
  if (!raw) return DEFAULT_POINT_RULES;

  try {
    const parsed = JSON.parse(raw) as PointRule[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_POINT_RULES;
    }

    const normalized = parsed
      .filter((rule) => Number.isFinite(rule.maxRank) && Number.isFinite(rule.points))
      .map((rule) => ({
        maxRank: Number(rule.maxRank),
        points: Number(rule.points),
        badge: rule.badge ?? null,
      }))
      .sort((a, b) => a.maxRank - b.maxRank);

    return normalized.length > 0 ? normalized : DEFAULT_POINT_RULES;
  } catch {
    return DEFAULT_POINT_RULES;
  }
};

const parseTimeToSeconds = (value?: string | null): number | null => {
  if (!value) return null;

  const segments = value.split(':').map((segment) => Number(segment));
  if (segments.some((segment) => Number.isNaN(segment) || segment < 0)) {
    return null;
  }

  if (segments.length === 3) {
    const [hours, minutes, seconds] = segments;
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (segments.length === 2) {
    const [minutes, seconds] = segments;
    return minutes * 60 + seconds;
  }

  return null;
};

const getPointsForRank = (rank: number, rules: PointRule[]) => {
  const matchedRule = rules.find((rule) => rank <= rule.maxRank) || rules[rules.length - 1];
  return {
    pointsEarned: matchedRule.points,
    badge: matchedRule.badge ?? null,
  };
};

export const rankResultsForLeaderboard = (results: ResultDraftInput[]): RankedResultEntry[] => {
  const rules = parsePointRules();
  const uniqueByUser = new Map<string, ResultDraftInput>();

  for (const result of results) {
    if (uniqueByUser.has(result.userId)) {
      throw new AppError(`Duplicate result for userId ${result.userId}`, 400);
    }
    uniqueByUser.set(result.userId, result);
  }

  const timed = Array.from(uniqueByUser.values())
    .map((entry) => {
      const seconds = parseTimeToSeconds(entry.time);
      if (seconds === null) {
        throw new AppError(`Invalid time format for userId ${entry.userId}`, 400);
      }

      return {
        ...entry,
        seconds,
      };
    })
    .sort((a, b) => a.seconds - b.seconds);

  let currentRank = 0;
  let previousSeconds: number | null = null;

  return timed.map((entry) => {
    if (previousSeconds === null || entry.seconds !== previousSeconds) {
      currentRank += 1;
      previousSeconds = entry.seconds;
    }

    const score = getPointsForRank(currentRank, rules);

    return {
      userId: entry.userId,
      time: entry.time,
      distance: entry.distance,
      seconds: entry.seconds,
      rank: currentRank,
      pointsEarned: score.pointsEarned,
      badge: score.badge,
    };
  });
};
