import type { PlannedExercise } from "../../db/repo";

interface Props {
  planned: PlannedExercise[];
  onUpdate: (index: number, changes: Partial<PlannedExercise>) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

/** The exercise list + sets/reps steppers shared by the workout builder and the routine editor. */
export function ExercisePlanList({ planned, onUpdate, onRemove, onAdd }: Props) {
  return (
    <>
      <div className="flex flex-col gap-2">
        {planned.map((p, index) => (
          <div key={`${p.exercise.id}-${index}`} className="rounded-xl bg-slate-800 p-3">
            <div className="flex items-start justify-between">
              <span className="font-medium text-slate-100">{p.exercise.name}</span>
              <button onClick={() => onRemove(index)} className="text-slate-500 active:text-red-400">
                ✕
              </button>
            </div>
            <div className="mt-2 flex gap-4">
              <Stepper
                label="Sets"
                value={p.targetSets}
                min={1}
                max={10}
                onChange={(v) => onUpdate(index, { targetSets: v })}
              />
              <Stepper
                label="Reps"
                value={p.targetReps}
                min={1}
                max={30}
                onChange={(v) => onUpdate(index, { targetReps: v })}
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onAdd}
        className="mt-3 w-full rounded-xl border border-dashed border-slate-700 py-3 font-medium text-sky-400 active:bg-slate-800"
      >
        + Add Exercise
      </button>
    </>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-400">{label}</span>
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-slate-200 active:bg-slate-600"
      >
        −
      </button>
      <span className="w-5 text-center text-slate-100">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-slate-200 active:bg-slate-600"
      >
        +
      </button>
    </div>
  );
}
