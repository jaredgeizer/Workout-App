import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";
import type { Exercise } from "../../types/exercise";
import { startWorkout, type PlannedExercise } from "../../db/repo";
import { ExercisePicker } from "./ExercisePicker";

interface Props {
  onCancel: () => void;
  onStarted: (sessionId: string) => void;
}

export function BuildWorkout({ onCancel, onStarted }: Props) {
  const gyms = useLiveQuery(() => db.gyms.orderBy("createdAt").toArray(), []) ?? [];
  const [gymId, setGymId] = useState<string>("");
  const [planned, setPlanned] = useState<PlannedExercise[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const selectedGym = gyms.find((g) => g.id === gymId);

  function addExercise(exercise: Exercise) {
    setPlanned((prev) => [...prev, { exercise, targetSets: 3, targetReps: 10 }]);
    setIsPicking(false);
  }

  function updatePlanned(index: number, changes: Partial<PlannedExercise>) {
    setPlanned((prev) => prev.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  }

  function removePlanned(index: number) {
    setPlanned((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleStart() {
    if (planned.length === 0) return;
    setIsStarting(true);
    const sessionId = await startWorkout(gymId || undefined, planned);
    onStarted(sessionId);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <button onClick={onCancel} className="text-sm font-medium text-slate-400 active:text-slate-200">
          Cancel
        </button>
        <h1 className="text-lg font-semibold text-slate-100">New Workout</h1>
        <button
          onClick={handleStart}
          disabled={planned.length === 0 || isStarting}
          className="text-sm font-semibold text-sky-400 disabled:text-slate-600"
        >
          Start
        </button>
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

        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exercises</h2>
        </div>

        <div className="flex flex-col gap-2">
          {planned.map((p, index) => (
            <div key={`${p.exercise.id}-${index}`} className="rounded-xl bg-slate-800 p-3">
              <div className="flex items-start justify-between">
                <span className="font-medium text-slate-100">{p.exercise.name}</span>
                <button onClick={() => removePlanned(index)} className="text-slate-500 active:text-red-400">
                  ✕
                </button>
              </div>
              <div className="mt-2 flex gap-4">
                <Stepper
                  label="Sets"
                  value={p.targetSets}
                  min={1}
                  max={10}
                  onChange={(v) => updatePlanned(index, { targetSets: v })}
                />
                <Stepper
                  label="Reps"
                  value={p.targetReps}
                  min={1}
                  max={30}
                  onChange={(v) => updatePlanned(index, { targetReps: v })}
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setIsPicking(true)}
          className="mt-3 w-full rounded-xl border border-dashed border-slate-700 py-3 font-medium text-sky-400 active:bg-slate-800"
        >
          + Add Exercise
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

function Stepper({
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
