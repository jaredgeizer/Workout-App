import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { loadSessionDetail, sessionMuscleSummary, sessionTotalVolume, deleteWorkout } from "../../db/repo";
import type { Exercise } from "../../types/exercise";
import { muscleDisplayName } from "../../types/muscleGroup";
import { ExerciseDetailModal } from "../workout/ExerciseDetailModal";
import { ExerciseThumbnail } from "../workout/ExerciseThumbnail";

interface Props {
  sessionId: string;
  onBack: () => void;
}

export function LogDetail({ sessionId, onBack }: Props) {
  const detail = useLiveQuery(() => loadSessionDetail(sessionId), [sessionId]);
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  const muscles = sessionMuscleSummary(detail);
  const volume = sessionTotalVolume(detail);

  async function handleDelete() {
    if (!confirm("Delete this workout?")) return;
    await deleteWorkout(sessionId);
    onBack();
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-2xl text-slate-400 active:text-slate-200" aria-label="Back">
          ‹
        </button>
        <h1 className="flex-1 text-lg font-semibold text-slate-100">
          {muscles.length > 0 ? muscles.map(muscleDisplayName).join(", ") : "Workout"}
        </h1>
        <button onClick={handleDelete} className="text-sm text-red-400 active:text-red-300">
          Delete
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-800 p-4 text-sm">
        <Stat label="Date" value={new Date(detail.session.date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} />
        <Stat label="Gym" value={detail.gym?.name ?? "Any Equipment"} />
        <Stat label="Duration" value={`${Math.round(detail.session.duration / 60)} min`} />
        <Stat label="Volume" value={`${Math.round(volume)} lb`} />
        {detail.session.effort !== undefined && <Stat label="Effort" value={`${detail.session.effort}/10`} />}
      </div>

      <div className="flex flex-col gap-3">
        {detail.performances.map((p) => (
          <div key={p.performance.id} className="rounded-xl bg-slate-800 p-3">
            <div className="mb-2 flex items-center gap-2">
              <ExerciseThumbnail exercise={p.exercise} onOpen={() => p.exercise && setDetailExercise(p.exercise)} />
              <h2 className="font-medium text-slate-100">{p.exercise?.name ?? "Exercise"}</h2>
            </div>
            <div className="flex flex-col gap-1">
              {p.sets.map((set) => (
                <div key={set.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Set {set.setNumber}</span>
                  <span className="text-slate-200">
                    {set.weight} lb × {set.reps} reps {set.isCompleted && <span className="text-emerald-400">✓</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {detailExercise && <ExerciseDetailModal exercise={detailExercise} onClose={() => setDetailExercise(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-slate-100">{value}</div>
    </div>
  );
}
