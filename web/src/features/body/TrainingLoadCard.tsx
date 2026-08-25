import { useLiveQuery } from "dexie-react-hooks";
import { computeTrainingLoad, type DayLoad, type LoadLabel } from "../../domain/trainingLoad";

const ACUTE_WINDOW_DAYS = 7;
const CHART_WIDTH = 320;
const CHART_HEIGHT = 120;
const CHART_PADDING_TOP = 10;
const LABEL_HEIGHT = 16;
const ROLLING_AVG_WINDOW = 7;

const LABEL_COLOR: Record<LoadLabel, string> = {
  "Well Above": "text-red-400",
  Above: "text-amber-400",
  Steady: "text-emerald-400",
  Below: "text-emerald-400",
  "Well Below": "text-emerald-400",
};

const LABEL_STROKE: Record<LoadLabel, string> = {
  "Well Above": "#f87171", // red-400
  Above: "#fbbf24", // amber-400
  Steady: "#34d399", // emerald-400
  Below: "#34d399",
  "Well Below": "#34d399",
};

const LABEL_DESCRIPTION: Record<LoadLabel, string> = {
  "Well Above":
    "Your 7-day training load is well above your recent average. This can boost fitness fast, but watch for excessive fatigue, soreness, or injury risk.",
  Above: "Your 7-day training load is above your recent average. You're pushing a bit harder than usual — keep an eye on recovery.",
  Steady: "Your 7-day training load is right in line with your recent average — a sustainable pace.",
  Below:
    "Your 7-day training load is a bit below your recent average. A lighter week is normal, but staying here too long can start to erode conditioning.",
  "Well Below":
    "Your 7-day training load is well below your recent average. If this continues, you may start losing the fitness you've built.",
};

export function TrainingLoadCard() {
  const summary = useLiveQuery(() => computeTrainingLoad(), []);

  if (!summary) return null;

  if (summary.label === null) {
    return (
      <div className="rounded-xl bg-slate-800 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Training Load</h2>
        <p className="mt-2 text-sm text-slate-400">
          Rate a workout's effort when you finish it to start seeing your training load here.
        </p>
      </div>
    );
  }

  const { label, percentDiff, days, lastRatedAt } = summary;
  const sign = (percentDiff ?? 0) >= 0 ? "+" : "";

  return (
    <div className="rounded-xl bg-slate-800 p-4">
      <h2 className={`text-xl font-bold ${LABEL_COLOR[label]}`}>{label}</h2>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {sign}
        {Math.round(percentDiff ?? 0)}% · 7-day vs. 28-day load
      </p>

      <p className="mt-3 text-sm text-slate-400">
        {lastRatedAt &&
          `Your last rated workout was recorded ${new Date(lastRatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}. `}
        {LABEL_DESCRIPTION[label]}
      </p>

      <TrainingLoadChart days={days} accentColor={LABEL_STROKE[label]} />
    </div>
  );
}

function TrainingLoadChart({ days, accentColor }: { days: DayLoad[]; accentColor: string }) {
  const maxLoad = Math.max(1, ...days.map((d) => d.load));
  const plotHeight = CHART_HEIGHT - CHART_PADDING_TOP;
  const stepX = CHART_WIDTH / (days.length - 1);

  function toX(index: number): number {
    return index * stepX;
  }
  function toY(load: number): number {
    return CHART_PADDING_TOP + plotHeight * (1 - load / maxLoad);
  }

  const points = days.map((d, i) => ({ x: toX(i), y: toY(d.load), load: d.load }));

  const rollingAvgPoints = days.map((_, i) => {
    const start = Math.max(0, i - ROLLING_AVG_WINDOW + 1);
    const window = days.slice(start, i + 1);
    const avg = window.reduce((sum, d) => sum + d.load, 0) / window.length;
    return { x: toX(i), y: toY(avg) };
  });

  const splitIndex = Math.max(0, days.length - ACUTE_WINDOW_DAYS);
  const olderPoints = points.slice(0, splitIndex + 1);
  const recentPoints = points.slice(splitIndex);

  const lastRatedIndex = [...days].map((d, i) => (d.load > 0 ? i : -1)).filter((i) => i >= 0).pop();

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + LABEL_HEIGHT}`}
      className="mt-4 w-full"
      preserveAspectRatio="none"
    >
      {[0, 7, 14, 21, 28].map((i) =>
        i < days.length ? (
          <g key={i}>
            <line x1={toX(i)} y1={0} x2={toX(i)} y2={CHART_HEIGHT} stroke="#334155" strokeWidth={1} strokeDasharray="3,3" />
            <text
              x={toX(i)}
              y={CHART_HEIGHT + LABEL_HEIGHT - 3}
              fill="#64748b"
              fontSize={10}
              textAnchor={i === 0 ? "start" : "middle"}
            >
              {parseDayKey(days[i].date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </text>
          </g>
        ) : null,
      )}

      <path d={pathFor(rollingAvgPoints)} fill="none" stroke="#cbd5e1" strokeWidth={1.5} strokeOpacity={0.6} />

      <path d={pathFor(olderPoints)} fill="none" stroke="#64748b" strokeWidth={2} />
      <path d={pathFor(recentPoints)} fill="none" stroke={accentColor} strokeWidth={2} />

      {points.map((p, i) =>
        p.load > 0 ? (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={i >= splitIndex ? accentColor : "#64748b"} />
        ) : null,
      )}

      {lastRatedIndex !== undefined && (
        <circle
          cx={points[lastRatedIndex].x}
          cy={points[lastRatedIndex].y}
          r={5}
          fill={accentColor}
          stroke="#0f172a"
          strokeWidth={2}
        />
      )}
    </svg>
  );
}

/** "YYYY-MM-DD" is parsed by `new Date()` as UTC midnight, which can shift a day in
 * negative-offset timezones — build the local date explicitly instead. */
function parseDayKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function pathFor(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}
