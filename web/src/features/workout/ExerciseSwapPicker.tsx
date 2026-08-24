import { useEffect, useState } from "react";
import type { Exercise } from "../../types/exercise";
import { findSimilarExercises } from "../../domain/alternatives";
import { muscleDisplayName } from "../../types/muscleGroup";
import { ExercisePicker } from "./ExercisePicker";

interface Props {
  currentExercise: Exercise;
  availableEquipmentIds: Set<string> | undefined;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExerciseSwapPicker({ currentExercise, availableEquipmentIds, onSelect, onClose }: Props) {
  const [alternatives, setAlternatives] = useState<Exercise[] | null>(null);
  const [isBrowsingAll, setIsBrowsingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void findSimilarExercises(currentExercise, availableEquipmentIds).then((results) => {
      if (!cancelled) setAlternatives(results);
    });
    return () => {
      cancelled = true;
    };
  }, [currentExercise, availableEquipmentIds]);

  if (isBrowsingAll) {
    return <ExercisePicker availableEquipmentIds={availableEquipmentIds} onSelect={onSelect} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Swap {currentExercise.name}</h2>
        <button onClick={onClose} className="text-sm font-medium text-sky-400 active:text-sky-300">
          Cancel
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto px-4">
        {(alternatives ?? []).map((exercise) => (
          <li key={exercise.id}>
            <button
              onClick={() => onSelect(exercise)}
              className="flex w-full flex-col items-start gap-0.5 border-b border-slate-800 py-3 text-left active:bg-slate-800/60"
            >
              <span className="text-slate-100">{exercise.name}</span>
              <span className="text-xs text-slate-500">{exercise.primaryMuscles.map(muscleDisplayName).join(", ")}</span>
            </button>
          </li>
        ))}
        {alternatives?.length === 0 && (
          <p className="mt-6 text-center text-slate-500">No close matches at this gym.</p>
        )}
      </ul>

      <button
        onClick={() => setIsBrowsingAll(true)}
        className="m-4 rounded-xl border border-dashed border-slate-700 py-3 text-center font-medium text-sky-400 active:bg-slate-800"
      >
        Browse All Exercises
      </button>
    </div>
  );
}
