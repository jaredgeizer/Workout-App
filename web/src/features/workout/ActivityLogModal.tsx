import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { listActivityTypes, logActivity } from "../../db/repo";
import { EffortSlider } from "./EffortSlider";

interface Props {
  onDone: () => void;
}

export function ActivityLogModal({ onDone }: Props) {
  const activityTypes = useLiveQuery(() => listActivityTypes(), []) ?? [];
  const [activityTypeId, setActivityTypeId] = useState<string | null>(null);
  const [duration, setDuration] = useState("30");
  const [effort, setEffort] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  const durationMinutes = Number(duration);
  const canSave = !!activityTypeId && durationMinutes > 0;

  async function handleSave() {
    if (!canSave || !activityTypeId) return;
    setIsSaving(true);
    await logActivity(activityTypeId, durationMinutes, effort);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Log Activity</h2>
        <button onClick={onDone} className="text-sm font-medium text-slate-400 active:text-slate-200">
          Cancel
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 pb-8">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Activity</label>
          <div className="flex flex-wrap gap-2">
            {activityTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActivityTypeId(type.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  activityTypeId === type.id
                    ? "bg-sky-500 text-slate-950"
                    : "bg-slate-800 text-slate-200 active:bg-slate-700"
                }`}
              >
                {type.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Duration (minutes)
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Effort</label>
          <EffortSlider value={effort} onChange={setEffort} />
        </div>

        <p className="text-xs text-slate-500">
          This counts toward muscle freshness and training load on the Body tab, the same as a
          workout — using duration in place of weight × reps.
        </p>
      </div>

      <div className="p-4">
        <button
          onClick={() => void handleSave()}
          disabled={!canSave || isSaving}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-semibold text-slate-950 active:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500"
        >
          Log Activity
        </button>
      </div>
    </div>
  );
}
