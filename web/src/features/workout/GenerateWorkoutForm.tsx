import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";
import { generateWorkout } from "../../domain/generateWorkout";
import type { PlannedExercise } from "../../db/repo";

interface Props {
  onCancel: () => void;
  onGenerated: (plan: PlannedExercise[], gymId: string | undefined) => void;
}

const DURATION_OPTIONS = [30, 45, 60, 90];

export function GenerateWorkoutForm({ onCancel, onGenerated }: Props) {
  const gyms = useLiveQuery(() => db.gyms.orderBy("createdAt").toArray(), []) ?? [];
  const [gymId, setGymId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setErrorMessage(null);
    const plan = await generateWorkout({ gymId: gymId || undefined, durationMinutes });
    setIsGenerating(false);
    if (plan.length === 0) {
      setErrorMessage("Couldn't find exercises for that gym's equipment. Try a different gym.");
      return;
    }
    onGenerated(plan, gymId || undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Generate Workout</h2>
        <button onClick={onCancel} className="text-sm font-medium text-sky-400 active:text-sky-300">
          Cancel
        </button>
      </div>

      <div className="flex flex-col gap-5 p-4">
        <div>
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

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</label>
          <div className="grid grid-cols-4 gap-2">
            {DURATION_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                onClick={() => setDurationMinutes(minutes)}
                className={`rounded-lg py-2 text-sm font-medium ${
                  durationMinutes === minutes ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300"
                }`}
              >
                {minutes}m
              </button>
            ))}
          </div>
        </div>

        {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full rounded-xl bg-sky-500 py-3 font-semibold text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isGenerating ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
