import { useEffect, useState } from "react";
import { formatElapsed } from "./formatTime";

interface Props {
  /** Prefilled target/last-value shown before Start is tapped. */
  initialSeconds: number;
  onComplete: (elapsedSeconds: number) => void;
}

/** Counts up from zero once started; user-controlled Start/Stop, unlike the fixed-duration RestTimer. */
export function HoldStopwatch({ initialSeconds, onComplete }: Props) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const elapsed = startedAt === null ? initialSeconds : Math.floor((now - startedAt) / 1000);

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-center tabular-nums text-slate-100">{formatElapsed(elapsed)}</span>
      {startedAt === null ? (
        <button
          onClick={() => setStartedAt(Date.now())}
          className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-slate-950 active:bg-sky-400"
        >
          Start
        </button>
      ) : (
        <button
          onClick={() => onComplete(Math.floor((Date.now() - startedAt) / 1000))}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 active:bg-emerald-400"
        >
          Stop
        </button>
      )}
    </div>
  );
}
