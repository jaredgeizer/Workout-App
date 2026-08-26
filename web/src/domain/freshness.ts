import { db } from "../db/schema";
import { getProfile } from "../db/repo";
import { MUSCLE_GROUPS, type MuscleGroup } from "../types/muscleGroup";
import type { ExercisePerformance, SetEntry } from "../types/workoutSession";

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

/** This session's weight×reps (or weight×hold-seconds) for an exercise, relative to your own
 * last time doing it, can shrink or grow that exercise's hit contribution by at most this much
 * — a single fluky data point (e.g. a one-rep test) shouldn't dominate the reading. */
export const RELATIVE_VOLUME_MIN = 0.5;
export const RELATIVE_VOLUME_MAX = 2.0;

/** Weight×reps (or weight×hold-seconds) proxy for how much work one set represents. Bodyweight
 * sets (weight 0) still count reps/duration as real work rather than zeroing out — unlike
 * `setVolume()` in workoutSession.ts, which intentionally reads 0 for those for the "Total
 * Volume" stat elsewhere; this is a different use, so it doesn't reuse that helper. */
function setLoadProxy(set: SetEntry, isHold: boolean): number {
  const quantity = isHold ? (set.holdSeconds ?? 0) : set.reps;
  const weightFactor = set.weight > 0 ? set.weight : 1;
  return weightFactor * quantity;
}

/** How this session's volume for one exercise compares to your own most recent prior session of
 * it — 1 (neutral) the first time you do an exercise, since there's nothing yet to compare to. */
function relativeVolumeFactor(thisVolume: number, baselineVolume: number): number {
  if (baselineVolume <= 0) return 1;
  return Math.min(RELATIVE_VOLUME_MAX, Math.max(RELATIVE_VOLUME_MIN, thisVolume / baselineVolume));
}

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

/** A muscle's most recent trained event, whichever kind won — a workout session (via one of
 * its exercises) or a logged activity (e.g. a run). Only the winner's own load matters for
 * that muscle's freshness, exactly as only the winning session mattered before activities
 * existed. */
type TrainedEvent =
  | { date: string; kind: "session"; sessionId: string }
  | { date: string; kind: "activity"; activityId: string };

/**
 * Scans completed session history and logged activities for the most recent date each muscle
 * was trained — as an exercise's primary/secondary mover, or via a logged activity's own
 * muscle mapping (e.g. Running -> quadriceps/hamstrings/calves) — and derives a freshness
 * score from whichever source won plus the recovery window.
 */
export async function computeMuscleFreshness(): Promise<MuscleFreshness[]> {
  const sessions = await db.sessions.toArray();
  const completedSessions = sessions.filter((s) => s.isCompleted);
  const sessionById = new Map(completedSessions.map((s) => [s.id, s]));

  const performances = await db.performances.toArray();
  const relevantPerformances = performances.filter((p) => sessionById.has(p.sessionId));

  const exercises = await db.exercises.bulkGet([...new Set(relevantPerformances.map((p) => p.exerciseId))]);
  const exerciseById = new Map(exercises.filter((e) => !!e).map((e) => [e.id, e]));

  const activities = await db.activities.toArray();
  const activityById = new Map(activities.map((a) => [a.id, a]));
  const activityTypes = await db.activityTypes.bulkGet([...new Set(activities.map((a) => a.activityTypeId))]);
  const activityTypeById = new Map(activityTypes.filter((t) => !!t).map((t) => [t.id, t]));

  const lastTrainedBy = new Map<MuscleGroup, TrainedEvent>();
  for (const performance of relevantPerformances) {
    const exercise = exerciseById.get(performance.exerciseId);
    const session = sessionById.get(performance.sessionId);
    if (!exercise || !session) continue;

    for (const muscle of [...exercise.primaryMuscles, ...exercise.secondaryMuscles]) {
      const existing = lastTrainedBy.get(muscle);
      if (!existing || session.date > existing.date) {
        lastTrainedBy.set(muscle, { date: session.date, kind: "session", sessionId: session.id });
      }
    }
  }
  for (const activity of activities) {
    const activityType = activityTypeById.get(activity.activityTypeId);
    if (!activityType) continue;

    for (const muscle of [...activityType.primaryMuscles, ...activityType.secondaryMuscles]) {
      const existing = lastTrainedBy.get(muscle);
      if (!existing || activity.date > existing.date) {
        lastTrainedBy.set(muscle, { date: activity.date, kind: "activity", activityId: activity.id });
      }
    }
  }

  // Only the performances that actually belong to some muscle's winning session matter from
  // here on — no need to load set data for the rest of history.
  const winningSessionIds = new Set(
    [...lastTrainedBy.values()].filter((v) => v.kind === "session").map((v) => v.sessionId),
  );
  const winningPerformances = relevantPerformances.filter((p) => winningSessionIds.has(p.sessionId));

  // For each winning performance, find the most recent *other* completed performance of the
  // same exercise from an earlier session — its own prior showing, used as this exercise's
  // personal baseline rather than any global strength number.
  const previousPerformanceByWinningId = new Map<string, ExercisePerformance | undefined>();
  for (const performance of winningPerformances) {
    const thisDate = sessionById.get(performance.sessionId)!.date;
    const sameExercise = relevantPerformances.filter(
      (other) => other.exerciseId === performance.exerciseId && sessionById.get(other.sessionId)!.date < thisDate,
    );
    sameExercise.sort((a, b) => sessionById.get(b.sessionId)!.date.localeCompare(sessionById.get(a.sessionId)!.date));
    previousPerformanceByWinningId.set(performance.id, sameExercise[0]);
  }
  const previousPerformances = [...previousPerformanceByWinningId.values()].filter(
    (p): p is ExercisePerformance => !!p,
  );

  const winningIds = winningPerformances.map((p) => p.id);
  const previousIds = previousPerformances.map((p) => p.id);
  const [winningSets, previousSets] = await Promise.all([
    winningIds.length > 0 ? db.sets.where("performanceId").anyOf(winningIds).toArray() : Promise.resolve<SetEntry[]>([]),
    previousIds.length > 0 ? db.sets.where("performanceId").anyOf(previousIds).toArray() : Promise.resolve<SetEntry[]>([]),
  ]);
  const setsByPerformanceId = new Map<string, SetEntry[]>();
  for (const set of [...winningSets, ...previousSets]) {
    const list = setsByPerformanceId.get(set.performanceId) ?? [];
    list.push(set);
    setsByPerformanceId.set(set.performanceId, list);
  }

  // How much weighted "hit" each muscle got within its own most-recent session (not across all
  // history) — primary movers count fully, secondary movers count for less (e.g. triceps still
  // gets some fatigue from a chest-primary Push Up, just less than chest does), each further
  // scaled by how this exercise's weight/reps compared to your own last time doing it.
  const weightedHitsByMuscle = new Map<MuscleGroup, number>();
  for (const performance of winningPerformances) {
    const exercise = exerciseById.get(performance.exerciseId);
    if (!exercise) continue;
    const isHold = performance.logMode === "hold";

    const thisVolume = (setsByPerformanceId.get(performance.id) ?? [])
      .filter((s) => s.isCompleted)
      .reduce((sum, s) => sum + setLoadProxy(s, isHold), 0);
    const previousPerformance = previousPerformanceByWinningId.get(performance.id);
    const baselineVolume = previousPerformance
      ? (setsByPerformanceId.get(previousPerformance.id) ?? [])
          .filter((s) => s.isCompleted)
          .reduce((sum, s) => sum + setLoadProxy(s, isHold), 0)
      : 0;
    const relativeFactor = relativeVolumeFactor(thisVolume, baselineVolume);

    for (const muscle of exercise.primaryMuscles) {
      const winner = lastTrainedBy.get(muscle);
      if (winner?.kind === "session" && winner.sessionId === performance.sessionId) {
        weightedHitsByMuscle.set(muscle, (weightedHitsByMuscle.get(muscle) ?? 0) + relativeFactor);
      }
    }
    for (const muscle of exercise.secondaryMuscles) {
      const winner = lastTrainedBy.get(muscle);
      if (winner?.kind === "session" && winner.sessionId === performance.sessionId) {
        weightedHitsByMuscle.set(muscle, (weightedHitsByMuscle.get(muscle) ?? 0) + SECONDARY_MOVER_WEIGHT * relativeFactor);
      }
    }
  }

  // Same idea for activity-sourced winners: an activity's own "volume" proxy is its duration
  // (weight-neutral, like a bodyweight set), compared against your most recent prior instance
  // of that same activity type.
  const winningActivityIds = new Set(
    [...lastTrainedBy.values()].filter((v) => v.kind === "activity").map((v) => v.activityId),
  );
  const winningActivities = activities.filter((a) => winningActivityIds.has(a.id));
  for (const activity of winningActivities) {
    const activityType = activityTypeById.get(activity.activityTypeId);
    if (!activityType) continue;

    const previousActivity = activities
      .filter((other) => other.activityTypeId === activity.activityTypeId && other.date < activity.date)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const relativeFactor = relativeVolumeFactor(activity.durationMinutes, previousActivity?.durationMinutes ?? 0);

    for (const muscle of activityType.primaryMuscles) {
      const winner = lastTrainedBy.get(muscle);
      if (winner?.kind === "activity" && winner.activityId === activity.id) {
        weightedHitsByMuscle.set(muscle, (weightedHitsByMuscle.get(muscle) ?? 0) + relativeFactor);
      }
    }
    for (const muscle of activityType.secondaryMuscles) {
      const winner = lastTrainedBy.get(muscle);
      if (winner?.kind === "activity" && winner.activityId === activity.id) {
        weightedHitsByMuscle.set(muscle, (weightedHitsByMuscle.get(muscle) ?? 0) + SECONDARY_MOVER_WEIGHT * relativeFactor);
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
    const effort =
      lastTrained.kind === "session"
        ? sessionById.get(lastTrained.sessionId)?.effort
        : activityById.get(lastTrained.activityId)?.effort;
    const recoveryWindow = MUSCLE_RECOVERY_HOURS[muscle] * ageMultiplier * effortRecoveryMultiplier(effort);
    const initialFreshness = initialFreshnessAfterSession(effort, weightedHitsByMuscle.get(muscle) ?? 1);
    const freshnessScore = initialFreshness + (1 - initialFreshness) * (hoursSince / recoveryWindow);
    return { muscle, lastTrainedAt: lastTrained.date, freshnessScore };
  });
}
