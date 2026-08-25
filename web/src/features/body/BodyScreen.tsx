import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { computeMuscleFreshness, type MuscleFreshness } from "../../domain/freshness";
import { muscleDisplayName } from "../../types/muscleGroup";

const REFRESH_INTERVAL_MS = 60_000;

export function BodyScreen() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const freshness = useLiveQuery(() => computeMuscleFreshness(), [tick]) ?? [];

  const withPercent = freshness
    .map((entry) => ({ ...entry, percent: Math.min(100, Math.round(entry.freshnessScore * 100)) }))
    .sort((a, b) => a.percent - b.percent);

  const fullyRecoveredCount = withPercent.filter((entry) => entry.percent >= 100).length;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Body</h1>
        <p className="text-sm text-slate-400">
          {fullyRecoveredCount} of {withPercent.length} muscle groups fully recovered
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {withPercent.map((entry) => (
          <li key={entry.muscle} className="rounded-xl bg-slate-800 p-3">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="font-medium text-slate-100">{muscleDisplayName(entry.muscle)}</span>
              <span className="text-sm tabular-nums text-slate-400">{entry.percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
              <div
                className={`h-full rounded-full ${barColor(entry.percent)}`}
                style={{ width: `${entry.percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{statusText(entry)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function barColor(percent: number): string {
  if (percent < 34) return "bg-red-500";
  if (percent < 67) return "bg-amber-500";
  return "bg-emerald-500";
}

function statusText(entry: MuscleFreshness & { percent: number }): string {
  if (!entry.lastTrainedAt) return "Never trained";
  if (entry.percent >= 100) return "Fully recovered";

  const hoursSince = (Date.now() - new Date(entry.lastTrainedAt).getTime()) / (1000 * 60 * 60);
  if (hoursSince < 1) return "Trained just now";
  if (hoursSince < 24) return `Trained ${Math.round(hoursSince)}h ago`;
  return `Trained ${Math.round(hoursSince / 24)}d ago`;
}
