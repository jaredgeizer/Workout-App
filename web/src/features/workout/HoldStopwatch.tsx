import { useEffect, useState } from "react";
import { playBeep, unlockAudio } from "./beep";
import { formatElapsed } from "./formatTime";

interface Props {
  /** Target hold time to count down from, shown before Start is tapped. */
  initialSeconds: number;
  onComplete: (elapsedSeconds: number) => void;
}

/** Counts down to the target once started, dinging once at zero, then keeps counting up as
 * overtime — user-controlled Start/Stop throughout, unlike the fixed-duration RestTimer. */
export function HoldStopwatch({ initialSeconds, onComplete }: Props) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (startedAt === null) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const elapsed = startedAt === null ? 0 : Math.floor((now - startedAt) / 1000);
  const remaining = initialSeconds - elapsed;
  const isOvertime = remaining <= 0;

  useEffect(() => {
    if (startedAt !== null && isOvertime) playBeep();
    // Only depends on isOvertime: it flips false -> true exactly once per hold, and this must
    // not re-fire on every second that follows while it stays true.
  }, [isOvertime]);

  return (
    <div className="flex items-center gap-2">
      <span className={`w-14 text-center tabular-nums ${isOvertime && startedAt !== null ? "text-amber-400" : "text-slate-100"}`}>
        {startedAt !== null && isOvertime ? `+${formatElapsed(-remaining)}` : formatElapsed(startedAt === null ? initialSeconds : remaining)}
      </span>
      {startedAt === null ? (
        <button
          onClick={() => {
            unlockAudio();
            const start = Date.now();
            setStartedAt(start);
            setNow(start); // without this, `now` is stale until the first interval tick a second later
          }}
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
