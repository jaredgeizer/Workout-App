import { db } from "../db/schema";
import { getProfile } from "../db/repo";
import { MUSCLE_GROUPS, type MuscleGroup } from "../types/muscleGroup";

/** Hours before a muscle group is considered fully recovered after being a primary mover. */
export const MUSCLE_RECOVERY_HOURS: Record<MuscleGroup, number> = {
  chest: 72,
  back: 72,
  lats: 72,
  quadriceps: 72,
  hamstrings: 72,
  glutes: 72,
  shoulders: 60,
  traps: 60,
  adductors: 60,
  abductors: 60,
  biceps: 48,
  triceps: 48,
  forearms: 48,
  abs: 48,
  obliques: 48,
  lowerBack: 48,
  calves: 48,
  neck: 48,
};

/**
 * Rough heuristic, not a tuned model: age is the one factor with real backing for needing
 * more recovery time, so it's the only one applied. +10% recovery time per decade past 30;
 * no adjustment below 30 rather than inventing a "recovers faster than baseline" effect.
 */
export function ageRecoveryMultiplier(age: number | undefined): number {
  if (!age || age <= 30) return 1;
  return 1 + ((age - 30) / 10) * 0.1;
}

export interface MuscleFreshness {
  muscle: MuscleGroup;
  lastTrainedAt: string | null;
  /** hoursSinceLastTrained / recoveryWindow. Uncapped above 1; never-trained muscles score as fully fresh. */
  freshnessScore: number;
}

/**
 * Scans completed session history for the most recent date each muscle was trained as an
 * exercise's primary mover, and derives a freshness score from that plus the recovery window.
 */
export async function computeMuscleFreshness(): Promise<MuscleFreshness[]> {
  const sessions = await db.sessions.toArray();
  const completedSessions = sessions.filter((s) => s.isCompleted);
  const sessionById = new Map(completedSessions.map((s) => [s.id, s]));

  const performances = await db.performances.toArray();
  const relevantPerformances = performances.filter((p) => sessionById.has(p.sessionId));

  const exercises = await db.exercises.bulkGet([...new Set(relevantPerformances.map((p) => p.exerciseId))]);
  const exerciseById = new Map(exercises.filter((e) => !!e).map((e) => [e.id, e]));

  const lastTrainedAt = new Map<MuscleGroup, string>();
  for (const performance of relevantPerformances) {
    const exercise = exerciseById.get(performance.exerciseId);
    const session = sessionById.get(performance.sessionId);
    if (!exercise || !session) continue;

    for (const muscle of exercise.primaryMuscles) {
      const existing = lastTrainedAt.get(muscle);
      if (!existing || session.date > existing) {
        lastTrainedAt.set(muscle, session.date);
      }
    }
  }

  const profile = await getProfile();
  const multiplier = ageRecoveryMultiplier(profile?.age);

  const now = Date.now();
  return MUSCLE_GROUPS.map((muscle) => {
    const lastDate = lastTrainedAt.get(muscle) ?? null;
    if (!lastDate) {
      return { muscle, lastTrainedAt: null, freshnessScore: 1 };
    }
    const hoursSince = (now - new Date(lastDate).getTime()) / (1000 * 60 * 60);
    const recoveryWindow = MUSCLE_RECOVERY_HOURS[muscle] * multiplier;
    return { muscle, lastTrainedAt: lastDate, freshnessScore: hoursSince / recoveryWindow };
  });
}
