import { useLiveQuery } from "dexie-react-hooks";
import type { WorkoutSession } from "../../types/workoutSession";
import type { Activity } from "../../types/activity";
import { loadSessionDetail, sessionMuscleSummary, sessionTotalVolume, listActivityTypes, deleteActivity } from "../../db/repo";
import { muscleDisplayName } from "../../types/muscleGroup";

interface Props {
  sessions: WorkoutSession[];
  activities: Activity[];
  onSelect: (id: string) => void;
}

type Row = { kind: "session"; date: string; session: WorkoutSession } | { kind: "activity"; date: string; activity: Activity };

export function LogList({ sessions, activities, onSelect }: Props) {
  const rows: Row[] = [
    ...sessions.map((session): Row => ({ kind: "session", date: session.date, session })),
    ...activities.map((activity): Row => ({ kind: "activity", date: activity.date, activity })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-semibold text-slate-100">Log</h1>

      {rows.length === 0 && (
        <p className="mt-8 text-center text-slate-400">Finish a workout to see it show up here.</p>
      )}

      <ul className="flex flex-col gap-2">
        {rows.map((row) =>
          row.kind === "session" ? (
            <LogRow key={row.session.id} session={row.session} onSelect={onSelect} />
          ) : (
            <ActivityRow key={row.activity.id} activity={row.activity} />
          ),
        )}
      </ul>
    </div>
  );
}

function LogRow({ session, onSelect }: { session: WorkoutSession; onSelect: (id: string) => void }) {
  const detail = useLiveQuery(() => loadSessionDetail(session.id), [session.id]);

  const muscles = detail ? sessionMuscleSummary(detail) : [];
  const volume = detail ? sessionTotalVolume(detail) : 0;
  const exerciseCount = detail?.performances.length ?? 0;
  const minutes = Math.round(session.duration / 60);

  return (
    <li>
      <button
        onClick={() => onSelect(session.id)}
        className="flex w-full flex-col items-start gap-1 rounded-xl bg-slate-800 px-4 py-3 text-left active:bg-slate-700"
      >
        <span className="text-xs text-slate-400">
          {new Date(session.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </span>
        <span className="font-medium text-slate-100">
          {muscles.length > 0 ? muscles.map(muscleDisplayName).join(", ") : "Workout"}
        </span>
        <span className="flex gap-4 text-xs text-slate-400">
          <span>{exerciseCount} exercises</span>
          <span>{minutes} min</span>
          <span>{Math.round(volume)} lb</span>
        </span>
      </button>
    </li>
  );
}

function ActivityRow({ activity }: { activity: Activity }) {
  const activityTypes = useLiveQuery(() => listActivityTypes(), []) ?? [];
  const activityType = activityTypes.find((t) => t.id === activity.activityTypeId);

  async function handleDelete() {
    if (!confirm(`Delete this ${activityType?.name ?? "activity"} log?`)) return;
    await deleteActivity(activity.id);
  }

  return (
    <li>
      <div className="flex w-full items-start justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3">
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-slate-400">
            {new Date(activity.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <span className="font-medium text-slate-100">🏃 {activityType?.name ?? "Activity"}</span>
          <span className="flex gap-4 text-xs text-slate-400">
            <span>{activity.durationMinutes} min</span>
            <span>Effort {activity.effort}/10</span>
          </span>
        </div>
        <button onClick={() => void handleDelete()} className="px-1 text-xs font-medium text-slate-500 active:text-red-400">
          Delete
        </button>
      </div>
    </li>
  );
}
