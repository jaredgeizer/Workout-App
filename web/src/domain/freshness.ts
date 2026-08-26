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

/** Recovery time grows this fraction per decade of age past 30. Exported (rather than kept
 * private) so the Profile screen's read-only explainer can quote the live value. */
export const AGE_RECOVERY_STEP_PER_DECADE = 0.1;

/**
 * Rough heuristic, not a tuned model: age is the one factor with real backing for needing
 * more recovery time, so it's the only one applied. No adjustment below 30 rather than
 * inventing a "recovers faster than baseline" effect.
 */
export function ageRecoveryMultiplier(age: number | undefined): number {
  if (!age || age <= 30) return 1;
  return 1 + ((age - 30) / 10) * AGE_RECOVERY_STEP_PER_DECADE;
}

/** Recovery time shifts this fraction per session-effort point away from 5 (moderate). */
export const EFFORT_RECOVERY_STEP_PER_POINT = 0.1;

/**
 * Effort 5 (medium) is neutral; recovery time shifts +/-10% per point away from that,
 * same rough-heuristic spirit as ageRecoveryMultiplier. Unrated sessions are neutral too.
 */
export function effortRecoveryMultiplier(effort: number | undefined): number {
  if (effort === undefined) return 1;
  return 1 + (effort - 5) * EFFORT_RECOVERY_STEP_PER_POINT;
}

/** A single exercise at max effort (10) fatigues a muscle this much when it's the primary
 * mover; scales down linearly with effort and stacks per exercise that hits the muscle in
 * the session. A secondary-mover hit counts for `SECONDARY_MOVER_WEIGHT` of one of these. */
export const PER_HIT_FATIGUE_AT_MAX_EFFORT = 2 / 3;

/** A secondary-mover hit (e.g. triceps on a chest-primary Push Up) fatigues a muscle this
 * fraction of what a primary-mover hit would — real work, but clearly less than the prime
 * mover's. Rough heuristic, same spirit as the other constants here. */
export const SECONDARY_MOVER_WEIGHT = 0.4;

/** However much volume/effort a session piles on, a muscle is never driven below this much
 * fresh immediately afterward — an all-out session shouldn't read the same as an injury. */
export const MAX_SESSION_FATIGUE = 0.8;

/**
 * How fresh a muscle reads the instant a session ends: 1 minus accumulated fatigue from every
 * exercise in that session that used it as a primary or secondary mover (weighted — see
 * `weightedHits`), scaled by the session's effort and capped so it never bottoms out
 * completely. Rough heuristic, tuned from a couple of examples rather than real data — expect
 * to retune the constants above as more sessions land.
 */
export function initialFreshnessAfterSession(effort: number | undefined, weightedHits: number): number {
  const effectiveEffort = effort ?? 5;
  const fatigue = Math.min(MAX_SESSION_FATIGUE, weightedHits * (effectiveEffort / 10) * PER_HIT_FATIGUE_AT_MAX_EFFORT);
  return 1 - fatigue;
}

export interface MuscleFreshness {
  muscle: MuscleGroup;
  lastTrainedAt: string | null;
  /**
   * 1.0 = fully recovered, 0 = just trained at max fatigue. Starts at
   * `initialFreshnessAfterSession(...)` right after the session and climbs linearly back to 1.0
   * over the recovery window, then keeps climbing past 1.0 the longer a muscle sits idle
   * (never-trained muscles score exactly 1).
   */
  freshnessScore: number;
}

/**
 * Scans completed session history for the most recent date each muscle was trained as an
 * exercise's primary or secondary mover, and derives a freshness score from that plus the
 * recovery window.
 */
export async function computeMuscleFreshness(): Promise<MuscleFreshness[]> {
  const sessions = await db.sessions.toArray();
  const completedSessions = sessions.filter((s) => s.isCompleted);
  const sessionById = new Map(completedSessions.map((s) => [s.id, s]));

  const performances = await db.performances.toArray();
  const relevantPerformances = performances.filter((p) => sessionById.has(p.sessionId));

  const exercises = await db.exercises.bulkGet([...new Set(relevantPerformances.map((p) => p.exerciseId))]);
  const exerciseById = new Map(exercises.filter((e) => !!e).map((e) => [e.id, e]));

  const lastTrainedBy = new Map<MuscleGroup, { date: string; sessionId: string }>();
  for (const performance of relevantPerformances) {
    const exercise = exerciseById.get(performance.exerciseId);
    const session = sessionById.get(performance.sessionId);
    if (!exercise || !session) continue;

    for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) {
      const existing = lastTrainedBy.get(muscle);
      if (!existing || session.date > existing.date) {
        lastTrainedBy.set(muscle, { date: session.date, sessionId: session.id });
      }
    }
  }

  // How much weighted "hit" each muscle got within its own most-recent session (not across all
  // history) — primary movers count fully, secondary movers count for less (e.g. two leg
  // exercises in the same workout fatigue quads more than one does; triceps still gets some
  // fatigue from a chest-primary Push Up, just less than chest does).
  const weightedHitsByMuscle = new Map<MuscleGroup, number>();
  for (const performance of relevantPerformances) {
    const exercise = exerciseById.get(performance.exerciseId);
    if (!exercise) continue;
    for (const muscle of exercise.primaryMuscles) {
      if (lastTrainedBy.get(muscle)?.sessionId === performance.sessionId) {
        weightedHitsByMuscle.set(muscle, (weightedHitsByMuscle.get(muscle) ?? 0) + 1);
      }
    }
    for (const muscle of exercise.secondaryMuscles) {
      if (lastTrainedBy.get(muscle)?.sessionId === performance.sessionId) {
        weightedHitsByMuscle.set(muscle, (weightedHitsByMuscle.get(muscle) ?? 0) + SECONDARY_MOVER_WEIGHT);
      }
    }
  }

  const profile = await getProfile();
  const ageMultiplier = ageRecoveryMultiplier(profile?.age);

  const now = Date.now();
  return MUSCLE_GROUPS.map((muscle) => {
    const lastTrained = lastTrainedBy.get(muscle);
    if (!lastTrained) {
      return { muscle, lastTrainedAt: null, freshnessScore: 1 };
    }
    const hoursSince = (now - new Date(lastTrained.date).getTime()) / (1000 * 60 * 60);
    const effort = sessionById.get(lastTrained.sessionId)?.effort;
    const recoveryWindow = MUSCLE_RECOVERY_HOURS[muscle] * ageMultiplier * effortRecoveryMultiplier(effort);
    const initialFreshness = initialFreshnessAfterSession(effort, weightedHitsByMuscle.get(muscle) ?? 1);
    const freshnessScore = initialFreshness + (1 - initialFreshness) * (hoursSince / recoveryWindow);
    return { muscle, lastTrainedAt: lastTrained.date, freshnessScore };
  });
}
