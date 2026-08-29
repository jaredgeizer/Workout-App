import type { MuscleGroup } from "./muscleGroup";

export const EXERCISE_CATEGORIES = ["compound", "isolation", "cardio"] as const;
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  category: ExerciseCategory;
  instructions?: string;
  equipmentIds: string[];
  isCustom: boolean;
  /** Absence means "reps"; this only ever flags an exercise that defaults to a timed hold. */
  defaultLogMode?: "hold";
  /** Path under /exercises/ to a still image or GIF showing the movement, e.g. "exercises/push-up.jpg". */
  mediaUrl?: string;
}

/** True if every piece of equipment this exercise requires is present in the given set. */
export function isExerciseAvailable(exercise: Exercise, availableEquipmentIds: Set<string>): boolean {
  return exercise.equipmentIds.length === 0 || exercise.equipmentIds.every((id) => availableEquipmentIds.has(id));
}
