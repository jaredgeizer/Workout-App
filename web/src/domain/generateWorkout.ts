import { db } from "../db/schema";
import type { PlannedExercise } from "../db/repo";
import type { Exercise } from "../types/exercise";
import { isExerciseAvailable } from "../types/exercise";
import type { MuscleGroup } from "../types/muscleGroup";
import type { SetEntry, WorkoutSession } from "../types/workoutSession";
import { computeMuscleFreshness } from "./freshness";
import { nextTarget } from "./progression";

const MINUTES_PER_TARGET_MUSCLE = 11; // roughly one target muscle group per 10-12 minutes
const MINUTES_PER_SET = 3;
const DEFAULT_SETS_PER_EXERCISE = 3;
const DEFAULT_REPS_MIN = 8;
const DEFAULT_REPS_MAX = 12;
const DEFAULT_HOLD_SECONDS = 30;

export interface GenerateWorkoutOptions {
  gymId?: string;
  durationMinutes: number;
}

/**
 * Picks exercises for whichever muscles have gone longest without training (relative to
 * their recovery window), constrained to the given gym's equipment and a time budget, then
 * seeds each exercise's target weight/reps from its most recent performance history using
 * the same double-progression rule saved routines use.
 */
export async function generateWorkout({ gymId, durationMinutes }: GenerateWorkoutOptions): Promise<PlannedExercise[]> {
  const [freshness, allExercises, gym] = await Promise.all([
    computeMuscleFreshness(),
    db.exercises.toArray(),
    gymId ? db.gyms.get(gymId) : Promise.resolve(undefined),
  ]);

  const availableEquipmentIds = gym ? new Set(gym.equipmentIds) : undefined;
  const availableExercises = availableEquipmentIds
    ? allExercises.filter((exercise) => isExerciseAvailable(exercise, availableEquipmentIds))
    : allExercises;

  const targetMuscleCount = Math.max(1, Math.round(durationMinutes / MINUTES_PER_TARGET_MUSCLE));
  const targetMuscles = new Set(
    [...freshness]
      .sort((a, b) => b.freshnessScore - a.freshnessScore)
      .slice(0, targetMuscleCount)
      .map((entry) => entry.muscle),
  );

  const totalSetBudget = Math.max(DEFAULT_SETS_PER_EXERCISE, Math.round(durationMinutes / MINUTES_PER_SET));

  const selected: Exercise[] = [];
  const covered = new Set<MuscleGroup>();
  let setsUsed = 0;

  const uncoveredTargets = () => [...targetMuscles].filter((muscle) => !covered.has(muscle));

  while (uncoveredTargets().length > 0 && setsUsed < totalSetBudget) {
    const remaining = uncoveredTargets();
    const candidates = availableExercises.filter(
      (exercise) => !selected.includes(exercise) && exercise.primaryMuscles.some((m) => remaining.includes(m)),
    );
    if (candidates.length === 0) break;

    candidates.sort((a, b) => {
      const aCoverage = a.primaryMuscles.filter((m) => remaining.includes(m)).length;
      const bCoverage = b.primaryMuscles.filter((m) => remaining.includes(m)).length;
      if (aCoverage !== bCoverage) return bCoverage - aCoverage;
      const aCompoundFirst = a.category === "compound" ? 0 : 1;
      const bCompoundFirst = b.category === "compound" ? 0 : 1;
      return aCompoundFirst - bCompoundFirst;
    });

    const chosen = candidates[0];
    selected.push(chosen);
    for (const muscle of chosen.primaryMuscles) covered.add(muscle);
    setsUsed += DEFAULT_SETS_PER_EXERCISE;
  }

  const planned: PlannedExercise[] = [];
  for (const exercise of selected) {
    const history = await mostRecentCompletedSets(exercise.id);

    if (exercise.defaultLogMode === "hold") {
      const lastHold = history?.sets.find((set) => set.holdSeconds !== undefined)?.holdSeconds;
      planned.push({
        exercise,
        targetSets: DEFAULT_SETS_PER_EXERCISE,
        targetReps: 0,
        logMode: "hold",
        targetHoldSeconds: lastHold ?? DEFAULT_HOLD_SECONDS,
        targetWeight: history?.weight ?? 0,
      });
      continue;
    }

    if (!history) {
      planned.push({ exercise, targetSets: DEFAULT_SETS_PER_EXERCISE, targetReps: DEFAULT_REPS_MIN, targetWeight: 0 });
      continue;
    }

    const next = nextTarget(
      history.sets.map((set) => ({ reps: set.reps, isCompleted: set.isCompleted })),
      { weight: history.weight, repsMin: DEFAULT_REPS_MIN, repsMax: DEFAULT_REPS_MAX, targetReps: DEFAULT_REPS_MIN },
    );
    planned.push({
      exercise,
      targetSets: DEFAULT_SETS_PER_EXERCISE,
      targetReps: next.targetReps,
      targetWeight: next.weight,
    });
  }

  return planned;
}

async function mostRecentCompletedSets(exerciseId: string): Promise<{ sets: SetEntry[]; weight: number } | undefined> {
  const performances = await db.performances.where("exerciseId").equals(exerciseId).toArray();
  if (performances.length === 0) return undefined;

  const sessions = await db.sessions.bulkGet(performances.map((p) => p.sessionId));
  const completedSessionById = new Map(
    sessions.filter((s): s is WorkoutSession => !!s && s.isCompleted).map((s) => [s.id, s]),
  );

  const candidates = performances.filter((p) => completedSessionById.has(p.sessionId));
  if (candidates.length === 0) return undefined;

  candidates.sort((a, b) => {
    const dateA = completedSessionById.get(a.sessionId)!.date;
    const dateB = completedSessionById.get(b.sessionId)!.date;
    return dateB.localeCompare(dateA);
  });

  const sets = await db.sets.where("performanceId").equals(candidates[0].id).toArray();
  if (sets.length === 0) return undefined;

  return { sets, weight: Math.max(...sets.map((set) => set.weight)) };
}
