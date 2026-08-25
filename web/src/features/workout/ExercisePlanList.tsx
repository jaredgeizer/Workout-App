import { useState } from "react";
import type { PlannedExercise } from "../../db/repo";
import type { Exercise } from "../../types/exercise";
import { ExerciseDetailModal } from "./ExerciseDetailModal";
import { ExerciseThumbnail } from "./ExerciseThumbnail";
import { SupersetSelectBar } from "./SupersetSelectBar";

interface Props {
  planned: PlannedExercise[];
  onUpdate: (index: number, changes: Partial<PlannedExercise>) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onMakeSuperset: (indexes: number[]) => void;
  onDisbandSuperset: (groupId: string) => void;
}

interface Block {
  groupId: string | undefined;
  items: { p: PlannedExercise; index: number }[];
}

/** Groups consecutive same-groupId planned exercises into one visual block. */
function toBlocks(planned: PlannedExercise[]): Block[] {
  const blocks: Block[] = [];
  planned.forEach((p, index) => {
    const last = blocks[blocks.length - 1];
    if (p.groupId && last?.groupId === p.groupId) {
      last.items.push({ p, index });
    } else {
      blocks.push({ groupId: p.groupId, items: [{ p, index }] });
    }
  });
  return blocks;
}

/** The exercise list + sets/reps steppers shared by the workout builder and the routine editor. */
export function ExercisePlanList({ planned, onUpdate, onRemove, onAdd, onMakeSuperset, onDisbandSuperset }: Props) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);

  function toggleSelected(index: number) {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleMakeSuperset() {
    onMakeSuperset([...selectedIndexes]);
    setSelectMode(false);
    setSelectedIndexes(new Set());
  }

  return (
    <>
      <div className="mb-2 flex justify-end">
        <SupersetSelectBar
          selectMode={selectMode}
          selectedCount={selectedIndexes.size}
          onEnterSelectMode={() => setSelectMode(true)}
          onCancel={() => {
            setSelectMode(false);
            setSelectedIndexes(new Set());
          }}
          onMakeSuperset={handleMakeSuperset}
        />
      </div>

      <div className="flex flex-col gap-2">
        {toBlocks(planned).map((block) => {
          const cards = block.items.map(({ p, index }) => (
            <div key={`${p.exercise.id}-${index}`} className="rounded-xl bg-slate-800 p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {selectMode && !p.groupId && (
                    <input
                      type="checkbox"
                      checked={selectedIndexes.has(index)}
                      onChange={() => toggleSelected(index)}
                      className="h-4 w-4 accent-sky-500"
                    />
                  )}
                  <ExerciseThumbnail exercise={p.exercise} onOpen={() => setDetailExercise(p.exercise)} />
                  <span className="font-medium text-slate-100">{p.exercise.name}</span>
                </div>
                <button onClick={() => onRemove(index)} className="text-slate-500 active:text-red-400">
                  ✕
                </button>
              </div>

              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onUpdate(index, { logMode: "reps" })}
                  className={`rounded-lg px-3 py-1 text-xs font-medium ${
                    p.logMode !== "hold" ? "bg-sky-500 text-slate-950" : "bg-slate-700 text-slate-300"
                  }`}
                >
                  Reps
                </button>
                <button
                  onClick={() => onUpdate(index, { logMode: "hold", targetHoldSeconds: p.targetHoldSeconds ?? 30 })}
                  className={`rounded-lg px-3 py-1 text-xs font-medium ${
                    p.logMode === "hold" ? "bg-sky-500 text-slate-950" : "bg-slate-700 text-slate-300"
                  }`}
                >
                  Hold
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-4">
                <Stepper label="Sets" value={p.targetSets} min={1} max={10} onChange={(v) => onUpdate(index, { targetSets: v })} />
                {p.logMode === "hold" ? (
                  <Stepper
                    label="Hold (s)"
                    value={p.targetHoldSeconds ?? 30}
                    min={5}
                    max={300}
                    step={5}
                    onChange={(v) => onUpdate(index, { targetHoldSeconds: v })}
                  />
                ) : (
                  <Stepper label="Reps" value={p.targetReps} min={1} max={30} onChange={(v) => onUpdate(index, { targetReps: v })} />
                )}
              </div>
            </div>
          ));

          if (!block.groupId) return cards[0];

          return (
            <div key={block.groupId} className="flex flex-col gap-2 rounded-xl p-2 ring-2 ring-amber-500/40">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">Superset</span>
                <button
                  onClick={() => onDisbandSuperset(block.groupId!)}
                  className="text-xs font-medium text-slate-500 active:text-red-400"
                >
                  Ungroup
                </button>
              </div>
              {cards}
            </div>
          );
        })}
      </div>

      <button
        onClick={onAdd}
        className="mt-3 w-full rounded-xl border border-dashed border-slate-700 py-3 font-medium text-sky-400 active:bg-slate-800"
      >
        + Add Exercise
      </button>

      {detailExercise && <ExerciseDetailModal exercise={detailExercise} onClose={() => setDetailExercise(null)} />}
    </>
  );
}

export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-sm text-slate-400">{label}</span>
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-slate-200 active:bg-slate-600"
      >
        −
      </button>
      <span className="w-5 text-center text-slate-100">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-slate-200 active:bg-slate-600"
      >
        +
      </button>
    </div>
  );
}
