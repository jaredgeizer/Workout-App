import type { Exercise } from "../../types/exercise";
import { muscleDisplayName } from "../../types/muscleGroup";

interface Props {
  exercise: Exercise;
  onClose: () => void;
  onEdit?: () => void;
}

export function ExerciseDetailModal({ exercise, onClose, onEdit }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-slate-100">{exercise.name}</h2>
        <div className="flex items-center gap-3">
          {onEdit && (
            <button onClick={onEdit} className="text-sm font-medium text-sky-400 active:text-sky-300">
              Edit
            </button>
          )}
          <button onClick={onClose} className="text-sm font-medium text-sky-400 active:text-sky-300">
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {exercise.mediaUrl ? (
          <img src={exercise.mediaUrl} alt={exercise.name} className="w-full rounded-xl object-cover" />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-slate-800 text-5xl">
            🏋️
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primary Muscles</h3>
          <p className="text-slate-100">{exercise.primaryMuscles.map(muscleDisplayName).join(", ")}</p>
        </div>

        {exercise.secondaryMuscles.length > 0 && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Secondary Muscles</h3>
            <p className="text-slate-100">{exercise.secondaryMuscles.map(muscleDisplayName).join(", ")}</p>
          </div>
        )}

        {exercise.instructions && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Instructions</h3>
            <p className="whitespace-pre-line text-slate-300">{exercise.instructions}</p>
          </div>
        )}

        {exercise.linkUrl && (
          <div className="mt-3">
            <a
              href={exercise.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-sky-400 active:text-sky-300"
            >
              🔗 View Link
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
