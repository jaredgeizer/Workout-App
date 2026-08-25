import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, newId } from "../../db/schema";
import type { Exercise } from "../../types/exercise";
import { DEFAULT_REST_SECONDS, startWorkout, saveAsRoutine, type PlannedExercise } from "../../db/repo";
import { groupTogether } from "../../domain/superset";
import { ExercisePicker } from "./ExercisePicker";
import { ExercisePlanList } from "./ExercisePlanList";

interface Props {
  onCancel: () => void;
  onStarted: (sessionId: string) => void;
  initialPlan?: PlannedExercise[];
  initialGymId?: string;
  initialRestSeconds?: number;
  routineId?: string;
}

export function BuildWorkout({ onCancel, onStarted, initialPlan, initialGymId, initialRestSeconds, routineId }: Props) {
  const gyms = useLiveQuery(() => db.gyms.orderBy("createdAt").toArray(), []) ?? [];
  const [gymId, setGymId] = useState<string>(initialGymId ?? "");
  const [planned, setPlanned] = useState<PlannedExercise[]>(initialPlan ?? []);
  const [restSeconds, setRestSeconds] = useState<number>(initialRestSeconds ?? DEFAULT_REST_SECONDS);
  const [isPicking, setIsPicking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSavingRoutine, setIsSavingRoutine] = useState(false);
  const [routineName, setRoutineName] = useState("");
  const [smartAdjustEnabled, setSmartAdjustEnabled] = useState(true);
  const [savedMessage, setSavedMessage] = useState(false);

  const selectedGym = gyms.find((g) => g.id === gymId);

  function addExercise(exercise: Exercise) {
    const isHold = exercise.defaultLogMode === "hold";
    setPlanned((prev) => [
      ...prev,
      {
        exercise,
        targetSets: 3,
        targetReps: 10,
        logMode: isHold ? "hold" : "reps",
        targetHoldSeconds: isHold ? 30 : undefined,
      },
    ]);
    setIsPicking(false);
  }

  function updatePlanned(index: number, changes: Partial<PlannedExercise>) {
    setPlanned((prev) => prev.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  }

  function removePlanned(index: number) {
    setPlanned((prev) => prev.filter((_, i) => i !== index));
  }

  function reorderPlanned(next: PlannedExercise[]) {
    setPlanned(next);
  }

  function makeSupersetLocal(indexes: number[]) {
    setPlanned((prev) => {
      const groupId = newId();
      const selected = new Set(indexes);
      const selectedItems = new Set(indexes.map((i) => prev[i]));
      return groupTogether(prev, selected).map((p) => (selectedItems.has(p) ? { ...p, groupId } : p));
    });
  }

  function disbandSupersetLocal(groupId: string) {
    setPlanned((prev) => prev.map((p) => (p.groupId === groupId ? { ...p, groupId: undefined } : p)));
  }

  async function handleStart() {
    if (planned.length === 0) return;
    setIsStarting(true);
    const sessionId = await startWorkout(gymId || undefined, planned, routineId, restSeconds);
    onStarted(sessionId);
  }

  async function handleSaveAsRoutine() {
    const trimmed = routineName.trim();
    if (!trimmed) return;
    await saveAsRoutine(trimmed, planned, smartAdjustEnabled, restSeconds);
    setIsSavingRoutine(false);
    setRoutineName("");
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-slate-800 p-4">
        <button onClick={onCancel} className="justify-self-start text-sm font-medium text-slate-400 active:text-slate-200">
          Cancel
        </button>
        <h1 className="justify-self-center text-lg font-semibold text-slate-100">New Workout</h1>
        <div />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-5">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Gym</label>
          <select
            value={gymId}
            onChange={(e) => setGymId(e.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700"
          >
            <option value="">Any Equipment</option>
            {gyms.map((gym) => (
              <option key={gym.id} value={gym.id}>
                {gym.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Rest time (s)</label>
          <input
            type="number"
            inputMode="numeric"
            value={restSeconds}
            onChange={(e) => setRestSeconds(Number(e.target.value) || DEFAULT_REST_SECONDS)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exercises</h2>
        </div>

        <ExercisePlanList
          planned={planned}
          onUpdate={updatePlanned}
          onRemove={removePlanned}
          onReorder={reorderPlanned}
          onAdd={() => setIsPicking(true)}
          onMakeSuperset={makeSupersetLocal}
          onDisbandSuperset={disbandSupersetLocal}
        />

        <div className="mt-4 border-t border-slate-800 pt-4">
          {!isSavingRoutine ? (
            <button
              onClick={() => setIsSavingRoutine(true)}
              disabled={planned.length === 0}
              className="w-full rounded-xl bg-slate-800 py-3 font-medium text-slate-200 disabled:text-slate-600"
            >
              {savedMessage ? "Saved as Routine ✓" : "Save as Routine"}
            </button>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl bg-slate-800 p-3">
              <input
                autoFocus
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveAsRoutine()}
                placeholder="Routine name"
                className="rounded-lg bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
              />
              <label className="flex items-center justify-between px-1">
                <span className="text-sm text-slate-300">Smart adjust weight/reps</span>
                <input
                  type="checkbox"
                  checked={smartAdjustEnabled}
                  onChange={(e) => setSmartAdjustEnabled(e.target.checked)}
                  className="h-5 w-5 accent-sky-500"
                />
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsSavingRoutine(false)}
                  className="flex-1 rounded-lg bg-slate-700 py-2 text-slate-200"
                >
                  Cancel
                </button>
                <button onClick={handleSaveAsRoutine} className="flex-1 rounded-lg bg-sky-500 py-2 font-medium text-slate-950">
                  Save
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => void handleStart()}
          disabled={planned.length === 0 || isStarting}
          className="mt-4 w-full rounded-xl bg-sky-500 py-4 text-lg font-semibold text-slate-950 active:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500"
        >
          Start Workout
        </button>
      </div>

      {isPicking && (
        <ExercisePicker
          availableEquipmentIds={selectedGym ? new Set(selectedGym.equipmentIds) : undefined}
          onSelect={addExercise}
          onClose={() => setIsPicking(false)}
        />
      )}
    </div>
  );
}
