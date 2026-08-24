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
}

export function exerciseAllMuscles(exercise: Exercise): MuscleGroup[] {
  return [...exercise.primaryMuscles, ...exercise.secondaryMuscles];
}

/** True if every piece of equipment this exercise requires is present in the given set. */
export function isExerciseAvailable(exercise: Exercise, availableEquipmentIds: Set<string>): boolean {
  return exercise.equipmentIds.length === 0 || exercise.equipmentIds.every((id) => availableEquipmentIds.has(id));
}
