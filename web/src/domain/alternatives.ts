import { db } from "../db/schema";
import type { Exercise } from "../types/exercise";
import { isExerciseAvailable } from "../types/exercise";

/**
 * Exercises that share at least one primary muscle with the given exercise, filtered to
 * available equipment when a gym is set, ranked by how many primary muscles they share.
 */
export async function findSimilarExercises(
  exercise: Exercise,
  availableEquipmentIds?: Set<string>,
): Promise<Exercise[]> {
  const all = await db.exercises.toArray();

  const candidates = all.filter(
    (candidate) =>
      candidate.id !== exercise.id &&
      candidate.primaryMuscles.some((muscle) => exercise.primaryMuscles.includes(muscle)),
  );

  const filtered = availableEquipmentIds
    ? candidates.filter((candidate) => isExerciseAvailable(candidate, availableEquipmentIds))
    : candidates;

  return filtered.sort((a, b) => sharedMuscleCount(b, exercise) - sharedMuscleCount(a, exercise));
}

function sharedMuscleCount(a: Exercise, b: Exercise): number {
  return a.primaryMuscles.filter((muscle) => b.primaryMuscles.includes(muscle)).length;
}
