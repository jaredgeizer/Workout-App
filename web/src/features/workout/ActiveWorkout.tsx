import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  addExerciseToSession,
  discardWorkout,
  finishWorkout,
  loadSessionDetail,
  swapExerciseInPerformance,
  updateSet,
  type PerformanceDetail,
} from "../../db/repo";
import type { Exercise } from "../../types/exercise";
import type { SetEntry } from "../../types/workoutSession";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseSwapPicker } from "./ExerciseSwapPicker";
import { RestTimer } from "./RestTimer";
import { unlockAudio } from "./beep";

const REST_DURATION_MS = 90_000;

interface Props {
  sessionId: string;
  onDone: () => void;
}

export function ActiveWorkout({ sessionId, onDone }: Props) {
  const detail = useLiveQuery(() => loadSessionDetail(sessionId), [sessionId]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [swappingPerformance, setSwappingPerformance] = useState<PerformanceDetail | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  async function handleSetToggle(set: SetEntry) {
    unlockAudio();
    const nextCompleted = !set.isCompleted;
    await updateSet(set.id, { isCompleted: nextCompleted });
    if (nextCompleted) {
      setRestEndsAt(Date.now() + REST_DURATION_MS);
    }
  }

  async function handleAddExercise(exercise: Exercise) {
    await addExerciseToSession(sessionId, exercise);
    setIsPicking(false);
  }

  async function handleSwapSelect(exercise: Exercise) {
    if (!swappingPerformance) return;
    await swapExerciseInPerformance(swappingPerformance.performance.id, exercise);
    setSwappingPerformance(null);
  }

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(detail.session.date).getTime()) / 1000));
  const elapsedLabel = formatElapsed(elapsedSeconds);
  const availableEquipmentIds = detail.gym ? new Set(detail.gym.equipmentIds) : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <button onClick={handleCancel} className="text-sm font-medium text-red-400 active:text-red-300">
          Cancel
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-lg font-semibold text-slate-100">Workout in Progress</h1>
          <span className="text-xs tabular-nums text-slate-500">{elapsedLabel}</span>
        </div>
        <button onClick={handleFinish} disabled={isSaving} className="text-sm font-semibold text-sky-400 disabled:text-slate-600">
          Finish
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="flex flex-col gap-4">
          {detail.performances.map((p) => {
            const canSwap = p.sets.every((set) => !set.isCompleted);
            return (
              <div key={p.performance.id} className="rounded-xl bg-slate-800 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-medium text-slate-100">{p.exercise?.name ?? "Exercise"}</h2>
                  {canSwap && p.exercise && (
                    <button
                      onClick={() => setSwappingPerformance(p)}
                      className="text-xs font-medium text-sky-400 active:text-sky-300"
                    >
                      Swap
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {p.sets.map((set) => (
                    <SetRow key={set.id} set={set} onToggleComplete={() => void handleSetToggle(set)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setIsPicking(true)}
          className="mt-4 w-full rounded-xl border border-dashed border-slate-700 py-3 font-medium text-sky-400 active:bg-slate-800"
        >
          + Add Exercise
        </button>
      </div>

      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
          <div className="rounded-xl bg-slate-800 px-4 py-3 text-slate-100">Saving…</div>
        </div>
      )}

      {isPicking && (
        <ExercisePicker
          availableEquipmentIds={availableEquipmentIds}
          onSelect={(exercise) => void handleAddExercise(exercise)}
          onClose={() => setIsPicking(false)}
        />
      )}

      {swappingPerformance?.exercise && (
        <ExerciseSwapPicker
          currentExercise={swappingPerformance.exercise}
          availableEquipmentIds={availableEquipmentIds}
          onSelect={(exercise) => void handleSwapSelect(exercise)}
          onClose={() => setSwappingPerformance(null)}
        />
      )}

      {restEndsAt !== null && (
        <RestTimer
          endsAt={restEndsAt}
          onAdjust={(deltaMs) => setRestEndsAt((prev) => (prev !== null ? prev + deltaMs : prev))}
          onDismiss={() => setRestEndsAt(null)}
        />
      )}
    </div>
  );
}

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function SetRow({ set, onToggleComplete }: { set: SetEntry; onToggleComplete: () => void }) {
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
        onClick={onToggleComplete}
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
