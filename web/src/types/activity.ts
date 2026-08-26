import type { MuscleGroup } from "./muscleGroup";

export interface ActivityType {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
}

export interface Activity {
  id: string;
  activityTypeId: string;
  date: string; // ISO timestamp
  durationMinutes: number;
  effort: number; // 1-10 RPE
}
