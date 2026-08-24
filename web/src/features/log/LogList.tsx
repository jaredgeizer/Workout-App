import { useLiveQuery } from "dexie-react-hooks";
import type { WorkoutSession } from "../../types/workoutSession";
import { loadSessionDetail, sessionMuscleSummary, sessionTotalVolume } from "../../db/repo";
import { muscleDisplayName } from "../../types/muscleGroup";

interface Props {
  sessions: WorkoutSession[];
  onSelect: (id: string) => void;
}

export function LogList({ sessions, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <h1 className="text-2xl font-semibold text-slate-100">Log</h1>

      {sessions.length === 0 && (
        <p className="mt-8 text-center text-slate-400">Finish a workout to see it show up here.</p>
      )}

      <ul className="flex flex-col gap-2">
        {sessions.map((session) => (
          <LogRow key={session.id} session={session} onSelect={onSelect} />
        ))}
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
