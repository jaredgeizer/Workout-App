/**
 * Double progression: work within a fixed rep range at a given weight. Once every set
 * hits the top of the range, bump the weight and drop back to the bottom of the range.
 * Missing the bottom of the range repeats the same weight/target next time.
 */

export interface ProgressionState {
  weight: number;
  repsMin: number;
  repsMax: number;
  targetReps: number;
}

export interface LoggedSet {
  reps: number;
  isCompleted: boolean;
}

const WEIGHT_INCREMENT_FACTOR = 1.05;
const WEIGHT_ROUNDING = 2.5;

function roundWeight(weight: number): number {
  return Math.round(weight / WEIGHT_ROUNDING) * WEIGHT_ROUNDING;
}

/**
 * Given the sets actually logged for an exercise in a finished session, returns the
 * progression state to use for that exercise's next session.
 */
export function nextTarget(loggedSets: LoggedSet[], state: ProgressionState): ProgressionState {
  if (loggedSets.length === 0) return state;

  const allCompleted = loggedSets.every((set) => set.isCompleted);
  if (!allCompleted) {
    return { ...state, targetReps: state.repsMin };
  }

  const minRepsAchieved = Math.min(...loggedSets.map((set) => set.reps));

  if (minRepsAchieved >= state.repsMax) {
    const nextWeight = state.weight > 0 ? roundWeight(state.weight * WEIGHT_INCREMENT_FACTOR) : state.weight;
    return { weight: nextWeight, repsMin: state.repsMin, repsMax: state.repsMax, targetReps: state.repsMin };
  }

  if (minRepsAchieved >= state.repsMin) {
    return { ...state, targetReps: Math.min(state.repsMax, minRepsAchieved + 1) };
  }

  return { ...state, targetReps: state.repsMin };
}
