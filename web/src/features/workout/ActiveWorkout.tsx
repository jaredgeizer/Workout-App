import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { discardWorkout, finishWorkout, loadSessionDetail, updateSet } from "../../db/repo";
import type { SetEntry } from "../../types/workoutSession";

interface Props {
  sessionId: string;
  onDone: () => void;
}

export function ActiveWorkout({ sessionId, onDone }: Props) {
  const detail = useLiveQuery(() => loadSessionDetail(sessionId), [sessionId]);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCancel() {
    if (!confirm("Discard this workout?")) return;
    await discardWorkout(sessionId);
    onDone();
  }

  async function handleFinish() {
    if (!detail) return;
    setIsSaving(true);
    const duration = (Date.now() - new Date(detail.session.date).getTime()) / 1000;
    await finishWorkout(sessionId, duration);
    onDone();
  }

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <button onClick={handleCancel} className="text-sm font-medium text-red-400 active:text-red-300">
          Cancel
        </button>
        <h1 className="text-lg font-semibold text-slate-100">Workout in Progress</h1>
        <button onClick={handleFinish} disabled={isSaving} className="text-sm font-semibold text-sky-400 disabled:text-slate-600">
          Finish
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-4">
          {detail.performances.map((p) => (
            <div key={p.performance.id} className="rounded-xl bg-slate-800 p-3">
              <h2 className="mb-2 font-medium text-slate-100">{p.exercise?.name ?? "Exercise"}</h2>
              <div className="flex flex-col gap-2">
                {p.sets.map((set) => (
                  <SetRow key={set.id} set={set} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
          <div className="rounded-xl bg-slate-800 px-4 py-3 text-slate-100">Saving…</div>
        </div>
      )}
    </div>
  );
}

function SetRow({ set }: { set: SetEntry }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 text-sm text-slate-400">Set {set.setNumber}</span>

      <input
        type="number"
        inputMode="decimal"
        value={set.weight === 0 ? "" : set.weight}
        placeholder="0"
        onChange={(e) => void updateSet(set.id, { weight: Number(e.target.value) || 0 })}
        className="w-16 rounded-lg bg-slate-900 px-2 py-1.5 text-center text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
      />
      <span className="text-xs text-slate-500">lb</span>

      <input
        type="number"
        inputMode="numeric"
        value={set.reps === 0 ? "" : set.reps}
        placeholder="0"
        onChange={(e) => void updateSet(set.id, { reps: Number(e.target.value) || 0 })}
        className="w-14 rounded-lg bg-slate-900 px-2 py-1.5 text-center text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
      />
      <span className="text-xs text-slate-500">reps</span>

      <button
        onClick={() => void updateSet(set.id, { isCompleted: !set.isCompleted })}
        className={`ml-auto flex h-8 w-8 items-center justify-center rounded-full text-lg ${
          set.isCompleted ? "bg-emerald-500 text-slate-950" : "bg-slate-700 text-slate-400"
        }`}
        aria-label={set.isCompleted ? "Mark incomplete" : "Mark complete"}
      >
        ✓
      </button>
    </div>
  );
}
