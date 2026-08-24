import type { Routine } from "../../types/routine";

interface Props {
  routines: Routine[];
  onSelect: (id: string) => void;
}

export function RoutineList({ routines, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-semibold text-slate-100">Routines</h1>

      {routines.length === 0 && (
        <p className="mt-8 text-center text-slate-400">
          Build a workout on the Workout tab and tap "Save as Routine" to see it here.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {routines.map((routine) => (
          <li key={routine.id}>
            <button
              onClick={() => onSelect(routine.id)}
              className="flex w-full items-center justify-between rounded-xl bg-slate-800 px-4 py-3 text-left active:bg-slate-700"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-100">{routine.name}</span>
                  {routine.smartAdjustEnabled && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      Smart adjust
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">{routine.exercises.length} exercises</p>
              </div>
              <span className="text-slate-500">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
