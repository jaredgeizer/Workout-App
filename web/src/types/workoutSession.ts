export interface WorkoutSession {
  id: string;
  date: string; // ISO timestamp
  duration: number; // seconds
  notes?: string;
  isCompleted: boolean;
  gymId?: string;
  routineId?: string;
  restSeconds?: number; // undefined = default rest time (see DEFAULT_REST_SECONDS)
}

export interface ExercisePerformance {
  id: string;
  sessionId: string;
  exerciseId: string;
  orderIndex: number;
  logMode?: "reps" | "hold"; // undefined = reps; snapshotted at creation like weight/reps targets are
  groupId?: string; // superset group id, shared across members
}

export interface SetEntry {
  id: string;
  performanceId: string;
  setNumber: number;
  weight: number;
  reps: number;
  holdSeconds?: number; // prefilled from target, overwritten with actual on Stop; unused for reps sets
  rpe?: number;
  isCompleted: boolean;
}

export function setVolume(set: SetEntry): number {
  if (!set.isCompleted) return 0;
  if (set.holdSeconds !== undefined) return 0; // time-under-tension isn't rep-volume
  return set.weight * set.reps;
}
