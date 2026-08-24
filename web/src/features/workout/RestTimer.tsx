import { useEffect, useState } from "react";
import { playBeep } from "./beep";

interface Props {
  endsAt: number;
  onAdjust: (deltaMs: number) => void;
  onDismiss: () => void;
}

export function RestTimer({ endsAt, onAdjust, onDismiss }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, endsAt - now);
  const isDone = remainingMs === 0;

  useEffect(() => {
    if (!isDone) return;
    playBeep();
    const timeout = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timeout);
    // Intentionally only depends on isDone: onDismiss is a fresh closure each parent render,
    // and re-triggering this effect on that would keep resetting the auto-dismiss timer.
  }, [isDone]);

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-3 bg-sky-500 px-4 py-3 text-slate-950"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <button
        onClick={() => onAdjust(-15_000)}
        className="rounded-lg bg-sky-600/40 px-3 py-1.5 font-medium active:bg-sky-600/60"
      >
        −15s
      </button>
      <span className="text-lg font-semibold tabular-nums">
        {isDone ? "Rest done!" : `${minutes}:${String(seconds).padStart(2, "0")}`}
      </span>
      <button
        onClick={() => onAdjust(15_000)}
        className="rounded-lg bg-sky-600/40 px-3 py-1.5 font-medium active:bg-sky-600/60"
      >
        +15s
      </button>
      <button onClick={onDismiss} className="rounded-lg bg-slate-950/20 px-3 py-1.5 font-medium active:bg-slate-950/30">
        Skip
      </button>
    </div>
  );
}
