export interface RoutineExerciseEntry {
  exerciseId: string;
  orderIndex: number;
  targetSets: number;
  targetRepsMin: number; // fixed floor of the working rep range
  targetRepsMax: number; // fixed ceiling of the working rep range
  currentTargetReps: number; // reps to aim for next session; climbs min -> max, then resets to min on a weight bump
  currentWeight: number; // 0 until the user has logged a real weight
}

export interface Routine {
  id: string;
  name: string;
  createdAt: string;
  smartAdjustEnabled: boolean;
  exercises: RoutineExerciseEntry[];
}
