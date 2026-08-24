export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "lats",
  "traps",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "lowerBack",
  "glutes",
  "quadriceps",
  "hamstrings",
  "calves",
  "adductors",
  "abductors",
  "neck",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

const DISPLAY_NAMES: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  lats: "Lats",
  traps: "Traps",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  lowerBack: "Lower Back",
  glutes: "Glutes",
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  calves: "Calves",
  adductors: "Adductors",
  abductors: "Abductors",
  neck: "Neck",
};

export function muscleDisplayName(muscle: MuscleGroup): string {
  return DISPLAY_NAMES[muscle];
}
