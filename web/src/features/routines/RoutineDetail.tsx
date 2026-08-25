import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, newId } from "../../db/schema";
import type { RoutineExerciseEntry } from "../../types/routine";
import type { Exercise } from "../../types/exercise";
import {
  DEFAULT_REST_SECONDS,
  renameRoutine,
  setRoutineRestSeconds,
  setRoutineSmartAdjust,
  updateRoutineExercises,
  deleteRoutine,
} from "../../db/repo";
import { blockRange, moveBlock, moveWithinGroup } from "../../domain/reorder";
import { groupTogether } from "../../domain/superset";
import { ExercisePicker } from "../workout/ExercisePicker";
import { Stepper } from "../workout/ExercisePlanList";
import { SupersetSelectBar } from "../workout/SupersetSelectBar";

interface Props {
  routineId: string;
  onBack: () => void;
  onStart: (routineId: string) => void;
}

interface Block {
  groupId: string | undefined;
  items: { entry: RoutineExerciseEntry; index: number }[];
}

/** Groups consecutive same-groupId entries into one visual block. */
function toBlocks(exercises: RoutineExerciseEntry[]): Block[] {
  const blocks: Block[] = [];
  exercises.forEach((entry, index) => {
    const last = blocks[blocks.length - 1];
    if (entry.groupId && last?.groupId === entry.groupId) {
      last.items.push({ entry, index });
    } else {
      blocks.push({ groupId: entry.groupId, items: [{ entry, index }] });
    }
  });
  return blocks;
}

export function RoutineDetail({ routineId, onBack, onStart }: Props) {
  const routine = useLiveQuery(() => db.routines.get(routineId), [routineId]);
  const exercises = useLiveQuery(
    () => db.exercises.bulkGet(routine?.exercises.map((entry) => entry.exerciseId) ?? []),
    [routine],
  );
  const [isPicking, setIsPicking] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());

  if (!routine) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  const currentRoutine = routine;
  const exerciseById = new Map((exercises ?? []).filter((e): e is Exercise => !!e).map((e) => [e.id, e]));

  function updateEntry(index: number, changes: Partial<RoutineExerciseEntry>) {
    const next = currentRoutine.exercises.map((entry, i) => (i === index ? { ...entry, ...changes } : entry));
    void updateRoutineExercises(routineId, next);
  }

  function removeEntry(index: number) {
    const next = currentRoutine.exercises.filter((_, i) => i !== index);
    void updateRoutineExercises(routineId, next);
  }

  function canMoveEntry(index: number, direction: "up" | "down"): boolean {
    const exercises = currentRoutine.exercises;
    if (exercises[index].groupId) {
      const swapWith = direction === "up" ? index - 1 : index + 1;
      return swapWith >= 0 && swapWith < exercises.length && exercises[swapWith].groupId === exercises[index].groupId;
    }
    const [start, end] = blockRange(exercises, index);
    return direction === "up" ? start > 0 : end < exercises.length;
  }

  function moveEntry(index: number, direction: "up" | "down") {
    const exercises = currentRoutine.exercises;
    const reordered = exercises[index].groupId
      ? moveWithinGroup(exercises, index, direction)
      : moveBlock(exercises, index, direction);
    void updateRoutineExercises(routineId, reordered.map((entry, i) => ({ ...entry, orderIndex: i })));
  }

  function moveGroup(firstIndex: number, direction: "up" | "down") {
    const exercises = currentRoutine.exercises;
    const reordered = moveBlock(exercises, firstIndex, direction);
    void updateRoutineExercises(routineId, reordered.map((entry, i) => ({ ...entry, orderIndex: i })));
  }

  function toggleSelected(index: number) {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function makeSuperset() {
    const groupId = newId();
    const selectedEntries = new Set([...selectedIndexes].map((i) => currentRoutine.exercises[i]));
    const reordered = groupTogether(currentRoutine.exercises, selectedIndexes).map((entry) =>
      selectedEntries.has(entry) ? { ...entry, groupId } : entry,
    );
    const reindexed = reordered.map((entry, index) => ({ ...entry, orderIndex: index }));
    void updateRoutineExercises(routineId, reindexed);
    setSelectMode(false);
    setSelectedIndexes(new Set());
  }

  function disbandSuperset(groupId: string) {
    const next = currentRoutine.exercises.map((entry) => (entry.groupId === groupId ? { ...entry, groupId: undefined } : entry));
    void updateRoutineExercises(routineId, next);
  }

  function addEntry(exercise: Exercise) {
    const isHold = exercise.defaultLogMode === "hold";
    const entry: RoutineExerciseEntry = {
      exerciseId: exercise.id,
      orderIndex: currentRoutine.exercises.length,
      targetSets: 3,
      targetRepsMin: 10,
      targetRepsMax: 10,
      currentTargetReps: 10,
      currentWeight: 0,
      logMode: isHold ? "hold" : "reps",
      targetHoldSeconds: isHold ? 30 : undefined,
    };
    void updateRoutineExercises(routineId, [...currentRoutine.exercises, entry]);
    setIsPicking(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${currentRoutine.name}"?`)) return;
    await deleteRoutine(routineId);
    onBack();
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-2xl text-slate-400 active:text-slate-200" aria-label="Back">
          ‹
        </button>
        <input
          value={routine.name}
          onChange={(e) => void renameRoutine(routineId, e.target.value)}
          className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-lg font-semibold text-slate-100 outline-none ring-1 ring-transparent focus:ring-sky-500"
        />
        <button onClick={handleDelete} className="text-sm text-red-400 active:text-red-300">
          Delete
        </button>
      </div>

      <label className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
        <div>
          <div className="text-slate-100">Smart adjust</div>
          <div className="text-xs text-slate-400">Auto-update weight/reps based on your last session</div>
        </div>
        <input
          type="checkbox"
          checked={routine.smartAdjustEnabled}
          onChange={(e) => void setRoutineSmartAdjust(routineId, e.target.checked)}
          className="h-5 w-5 accent-sky-500"
        />
      </label>

      <div className="rounded-xl bg-slate-800 px-4 py-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Rest time (s)</label>
        <input
          type="number"
          inputMode="numeric"
          value={routine.restSeconds ?? DEFAULT_REST_SECONDS}
          onChange={(e) => void setRoutineRestSeconds(routineId, Number(e.target.value) || DEFAULT_REST_SECONDS)}
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
        />
      </div>

      <button
        onClick={() => onStart(routineId)}
        className="w-full rounded-xl bg-sky-500 py-3 text-center font-semibold text-slate-950 active:bg-sky-400"
      >
        Start This Routine
      </button>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Exercises</h2>
          <SupersetSelectBar
            selectMode={selectMode}
            selectedCount={selectedIndexes.size}
            onEnterSelectMode={() => setSelectMode(true)}
            onCancel={() => {
              setSelectMode(false);
              setSelectedIndexes(new Set());
            }}
            onMakeSuperset={makeSuperset}
          />
        </div>
        <div className="flex flex-col gap-2">
          {toBlocks(routine.exercises).map((block) => {
            const cards = block.items.map(({ entry, index }) => (
              <div key={`${entry.exerciseId}-${index}`} className="rounded-xl bg-slate-800 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {selectMode && !entry.groupId && (
                      <input
                        type="checkbox"
                        checked={selectedIndexes.has(index)}
                        onChange={() => toggleSelected(index)}
                        className="h-4 w-4 accent-sky-500"
                      />
                    )}
                    <span className="font-medium text-slate-100">
                      {exerciseById.get(entry.exerciseId)?.name ?? "Exercise"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveEntry(index, "up")}
                      disabled={!canMoveEntry(index, "up")}
                      aria-label="Move up"
                      className="text-slate-500 active:text-slate-300 disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveEntry(index, "down")}
                      disabled={!canMoveEntry(index, "down")}
                      aria-label="Move down"
                      className="text-slate-500 active:text-slate-300 disabled:opacity-30"
                    >
                      ▼
                    </button>
                    <button onClick={() => removeEntry(index)} className="text-slate-500 active:text-red-400">
                      ✕
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => updateEntry(index, { logMode: "reps" })}
                    className={`rounded-lg px-3 py-1 text-xs font-medium ${
                      entry.logMode !== "hold" ? "bg-sky-500 text-slate-950" : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    Reps
                  </button>
                  <button
                    onClick={() => updateEntry(index, { logMode: "hold", targetHoldSeconds: entry.targetHoldSeconds ?? 30 })}
                    className={`rounded-lg px-3 py-1 text-xs font-medium ${
                      entry.logMode === "hold" ? "bg-sky-500 text-slate-950" : "bg-slate-700 text-slate-300"
                    }`}
                  >
                    Hold
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-4">
                  <Stepper
                    label="Sets"
                    value={entry.targetSets}
                    min={1}
                    max={10}
                    onChange={(v) => updateEntry(index, { targetSets: v })}
                  />
                  {entry.logMode === "hold" ? (
                    <Stepper
                      label="Hold (s)"
                      value={entry.targetHoldSeconds ?? 30}
                      min={5}
                      max={300}
                      step={5}
                      onChange={(v) => updateEntry(index, { targetHoldSeconds: v })}
                    />
                  ) : (
                    <>
                      <Stepper
                        label="Min Reps"
                        value={entry.targetRepsMin}
                        min={1}
                        max={entry.targetRepsMax}
                        onChange={(v) =>
                          updateEntry(index, {
                            targetRepsMin: v,
                            currentTargetReps: Math.min(Math.max(entry.currentTargetReps, v), entry.targetRepsMax),
                          })
                        }
                      />
                      <Stepper
                        label="Max Reps"
                        value={entry.targetRepsMax}
                        min={entry.targetRepsMin}
                        max={30}
                        onChange={(v) => updateEntry(index, { targetRepsMax: v })}
                      />
                    </>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-slate-400">Weight</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={entry.currentWeight === 0 ? "" : entry.currentWeight}
                    placeholder="0"
                    onChange={(e) => updateEntry(index, { currentWeight: Number(e.target.value) || 0 })}
                    className="w-20 rounded-lg bg-slate-900 px-2 py-1.5 text-center text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
                  />
                  {entry.logMode === "hold" ? (
                    <span className="text-xs text-slate-500">lb</span>
                  ) : (
                    <span className="text-xs text-slate-500">lb, next target {entry.currentTargetReps} reps</span>
                  )}
                </div>
              </div>
            ));

            if (!block.groupId) return cards[0];

            return (
              <div key={block.groupId} className="flex flex-col gap-2 rounded-xl p-2 ring-2 ring-amber-500/40">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">Superset</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveGroup(block.items[0].index, "up")}
                      disabled={blockRange(routine.exercises, block.items[0].index)[0] === 0}
                      aria-label="Move superset up"
                      className="text-xs font-medium text-slate-500 active:text-slate-300 disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveGroup(block.items[0].index, "down")}
                      disabled={blockRange(routine.exercises, block.items[0].index)[1] === routine.exercises.length}
                      aria-label="Move superset down"
                      className="text-xs font-medium text-slate-500 active:text-slate-300 disabled:opacity-30"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => disbandSuperset(block.groupId!)}
                      className="text-xs font-medium text-slate-500 active:text-red-400"
                    >
                      Ungroup
                    </button>
                  </div>
                </div>
                {cards}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setIsPicking(true)}
          className="mt-3 w-full rounded-xl border border-dashed border-slate-700 py-3 font-medium text-sky-400 active:bg-slate-800"
        >
          + Add Exercise
        </button>
      </div>

      {isPicking && (
        <ExercisePicker availableEquipmentIds={undefined} onSelect={addEntry} onClose={() => setIsPicking(false)} />
      )}
    </div>
  );
}
