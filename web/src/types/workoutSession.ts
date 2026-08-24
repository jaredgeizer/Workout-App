export interface WorkoutSession {
  id: string;
  date: string; // ISO timestamp
  duration: number; // seconds
  notes?: string;
  isCompleted: boolean;
  gymId?: string;
}

export interface ExercisePerformance {
  id: string;
  sessionId: string;
  exerciseId: string;
  orderIndex: number;
}

export interface SetEntry {
  id: string;
  performanceId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number;
  isCompleted: boolean;
}

export function setVolume(set: SetEntry): number {
  return set.isCompleted ? set.weight * set.reps : 0;
}
