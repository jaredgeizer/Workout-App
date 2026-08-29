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

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function EffortSlider({ value, onChange }: Props) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-5xl font-bold tabular-nums text-slate-100">{value}</span>
      <span className="text-lg font-medium text-sky-400">{EFFORT_WORDS[value]}</span>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-500"
      />
      <div className="flex w-full justify-between text-xs text-slate-500">
        <span>1 · Very Easy</span>
        <span>10 · Max Effort</span>
      </div>
    </div>
  );
}
