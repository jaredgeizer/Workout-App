import { useState } from "react";
import { rateWorkoutEffort } from "../../db/repo";

interface Props {
  sessionId: string;
  onDone: () => void;
}

const EFFORT_WORDS: Record<number, string> = {
  1: "Very Easy",
  2: "Easy",
  3: "Easy",
  4: "Light",
  5: "Moderate",
  6: "Moderate",
  7: "Hard",
  8: "Hard",
  9: "Very Hard",
  10: "Max Effort",
};

export function EffortRatingModal({ sessionId, onDone }: Props) {
  const [effort, setEffort] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    await rateWorkoutEffort(sessionId, effort);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Rate Your Effort</h2>
        <button onClick={onDone} className="text-sm font-medium text-slate-400 active:text-slate-200">
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-6 p-6">
        <div className="flex flex-col items-center gap-2">
          <span className="text-5xl font-bold tabular-nums text-slate-100">{effort}</span>
          <span className="text-lg font-medium text-sky-400">{EFFORT_WORDS[effort]}</span>
        </div>

        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={effort}
          onChange={(e) => setEffort(Number(e.target.value))}
          className="w-full accent-sky-500"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>1 · Very Easy</span>
          <span>10 · Max Effort</span>
        </div>

        <p className="text-center text-sm text-slate-400">
          How hard was this workout overall? This feeds your training load below, and a harder
          session keeps the muscles it worked marked as tired a bit longer.
        </p>
      </div>

      <div className="p-4">
        <button
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-semibold text-slate-950 active:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500"
        >
          Save
        </button>
      </div>
    </div>
  );
}
