import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DEFAULT_REST_SECONDS,
  addExerciseToSession,
  addSetToPerformance,
  disbandSuperset,
  discardWorkout,
  finishWorkout,
  loadSessionDetail,
  makeSuperset,
  reorderPerformances,
  removeSet,
  swapExerciseInPerformance,
  updateSet,
  updateSetWithCascade,
  type PerformanceDetail,
} from "../../db/repo";
import { blockRange, moveBlock, moveWithinGroup } from "../../domain/reorder";
import { advanceSupersetRotation, type SupersetGroupMember } from "../../domain/superset";
import type { Exercise } from "../../types/exercise";
import type { SetEntry } from "../../types/workoutSession";
import { EffortRatingModal } from "./EffortRatingModal";
import { ExerciseDetailModal } from "./ExerciseDetailModal";
import { ExercisePicker } from "./ExercisePicker";
import { ExerciseSwapPicker } from "./ExerciseSwapPicker";
import { ExerciseThumbnail } from "./ExerciseThumbnail";
import { HoldStopwatch } from "./HoldStopwatch";
import { RestTimer } from "./RestTimer";
import { SupersetSelectBar } from "./SupersetSelectBar";
import { formatElapsed } from "./formatTime";
import { unlockAudio } from "./beep";

type SetStatus = "completed" | "active" | "pending";

interface Block {
  groupId: string | undefined;
  members: PerformanceDetail[];
}

/** Groups consecutive same-groupId performances into one visual block. Cheap linear pass since
 * makeSuperset() already keeps a group's members contiguous by orderIndex. */
function toBlocks(performances: PerformanceDetail[]): Block[] {
  const blocks: Block[] = [];
  for (const p of performances) {
    const groupId = p.performance.groupId;
    const last = blocks[blocks.length - 1];
    if (groupId && last?.groupId === groupId) {
      last.members.push(p);
    } else {
      blocks.push({ groupId, members: [p] });
    }
  }
  return blocks;
}

function defaultFocus(members: PerformanceDetail[]): string {
  const firstIncomplete = members.find((m) => m.sets.some((set) => !set.isCompleted));
  return (firstIncomplete ?? members[0]).performance.id;
}

interface Props {
  sessionId: string;
  onDone: () => void;
}

export function ActiveWorkout({ sessionId, onDone }: Props) {
  const detail = useLiveQuery(() => loadSessionDetail(sessionId), [sessionId]);
  const [isSaving, setIsSaving] = useState(false);
  const [isRatingEffort, setIsRatingEffort] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [swappingPerformance, setSwappingPerformance] = useState<PerformanceDetail | null>(null);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [groupFocus, setGroupFocus] = useState<Record<string, string>>({});
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleCancel() {
    if (!confirm("Discard this workout?")) return;
    await discardWorkout(sessionId);
    onDone();
  }

  async function handleFinish() {
    if (!detail) return;
    setRestEndsAt(null); // don't leave a rest timer floating over the effort-rating screen
    setIsSaving(true);
    const duration = (Date.now() - new Date(detail.session.date).getTime()) / 1000;
    await finishWorkout(sessionId, duration);
    setIsSaving(false);
    setIsRatingEffort(true);
  }

  /** Writes the set, then — only if it belongs to a superset group — advances whose turn it is
   * and decides whether a full round just completed (the only time the group's rest timer fires). */
  async function logSet(
    members: PerformanceDetail[] | undefined,
    performance: PerformanceDetail,
    set: SetEntry,
    extra?: Partial<Pick<SetEntry, "reps" | "weight" | "holdSeconds">>,
  ) {
    unlockAudio();
    await updateSet(set.id, { ...extra, isCompleted: true });

    // Nothing left to rest before if that was the last remaining set in the whole workout —
    // skip starting a rest timer that would otherwise float over the "Finish Workout" screen.
    const isLastRemainingSet = detail?.performances.every((p) => p.sets.every((s) => s.id === set.id || s.isCompleted)) ?? false;
    if (isLastRemainingSet) {
      setRestEndsAt(null);
      return;
    }

    const restDurationMs = (detail?.session.restSeconds ?? DEFAULT_REST_SECONDS) * 1000;
    const groupId = performance.performance.groupId;
    if (!groupId || !members) {
      setRestEndsAt(Date.now() + restDurationMs);
      return;
    }

    const groupMembers: SupersetGroupMember[] = members.map((m) => {
      const completedSets =
        m.sets.filter((s) => s.isCompleted).length + (m.performance.id === performance.performance.id ? 1 : 0);
      return { performanceId: m.performance.id, completedSets, totalSets: m.sets.length };
    });

    const { nextPerformanceId, roundCompleted } = advanceSupersetRotation(groupMembers, performance.performance.id);
    if (nextPerformanceId) setGroupFocus((prev) => ({ ...prev, [groupId]: nextPerformanceId }));
    if (roundCompleted) setRestEndsAt(Date.now() + restDurationMs);
  }

  async function handleUndoSet(set: SetEntry) {
    await updateSet(set.id, { isCompleted: false });
  }

  async function handleRemoveSet(set: SetEntry) {
    if (set.isCompleted && !confirm("Remove this logged set?")) return;
    await removeSet(set.id);
  }

  async function handleAddSet(performanceId: string) {
    await addSetToPerformance(performanceId);
  }

  async function handleAddExercise(exercise: Exercise) {
    await addExerciseToSession(sessionId, exercise);
    setIsPicking(false);
  }

  async function handleSwapSelect(exercise: Exercise) {
    if (!swappingPerformance) return;
    await swapExerciseInPerformance(swappingPerformance.performance.id, exercise);
    setSwappingPerformance(null);
  }

  function toggleSelected(performanceId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(performanceId)) next.delete(performanceId);
      else next.add(performanceId);
      return next;
    });
  }

  async function handleMakeSuperset() {
    await makeSuperset(sessionId, [...selectedIds]);
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  if (!detail) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(detail.session.date).getTime()) / 1000));
  const elapsedLabel = formatElapsed(elapsedSeconds);
  const availableEquipmentIds = detail.gym ? new Set(detail.gym.equipmentIds) : undefined;

  const performances = detail.performances.map((pd) => pd.performance);
  const performanceIndex = new Map(performances.map((perf, i) => [perf.id, i]));

  function canMoveEntry(index: number, direction: "up" | "down"): boolean {
    if (performances[index].groupId) {
      const swapWith = direction === "up" ? index - 1 : index + 1;
      return swapWith >= 0 && swapWith < performances.length && performances[swapWith].groupId === performances[index].groupId;
    }
    const [start, end] = blockRange(performances, index);
    return direction === "up" ? start > 0 : end < performances.length;
  }

  function moveEntry(index: number, direction: "up" | "down") {
    const reordered = performances[index].groupId
      ? moveWithinGroup(performances, index, direction)
      : moveBlock(performances, index, direction);
    void reorderPerformances(reordered.map((perf) => perf.id));
  }

  function moveGroup(firstIndex: number, direction: "up" | "down") {
    void reorderPerformances(moveBlock(performances, firstIndex, direction).map((perf) => perf.id));
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="grid grid-cols-[auto_1fr_auto] items-center border-b border-slate-800 p-4">
        <button onClick={handleCancel} className="justify-self-start text-sm font-medium text-red-400 active:text-red-300">
          Cancel
        </button>
        <div className="flex flex-col items-center justify-self-center">
          <h1 className="text-lg font-semibold text-slate-100">Workout in Progress</h1>
          <span className="text-xs tabular-nums text-slate-500">{elapsedLabel}</span>
        </div>
        <div />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="mb-2 flex justify-end">
          <SupersetSelectBar
            selectMode={selectMode}
            selectedCount={selectedIds.size}
            onEnterSelectMode={() => setSelectMode(true)}
            onCancel={() => {
              setSelectMode(false);
              setSelectedIds(new Set());
            }}
            onMakeSuperset={() => void handleMakeSuperset()}
          />
        </div>

        <div className="flex flex-col gap-4">
          {toBlocks(detail.performances).map((block) => {
            const focusedId = block.groupId ? (groupFocus[block.groupId] ?? defaultFocus(block.members)) : undefined;

            const cards = block.members.map((p) => {
              const canAct = !block.groupId || p.performance.id === focusedId;
              const canSwap = p.sets.every((set) => !set.isCompleted);
              const isHoldMode = p.performance.logMode === "hold";
              const sortedSets = [...p.sets].sort((a, b) => a.setNumber - b.setNumber);
              const activeIndex = sortedSets.findIndex((set) => !set.isCompleted);
              const isExerciseLogged = activeIndex === -1;
              const isFinalSet = activeIndex === sortedSets.length - 1;

              return (
                <div key={p.performance.id} className="rounded-xl bg-slate-800 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {selectMode && !p.performance.groupId && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.performance.id)}
                          onChange={() => toggleSelected(p.performance.id)}
                          className="h-4 w-4 accent-sky-500"
                        />
                      )}
                      <ExerciseThumbnail exercise={p.exercise} onOpen={() => p.exercise && setDetailExercise(p.exercise)} />
                      <h2
                        onClick={
                          block.groupId ? () => setGroupFocus((prev) => ({ ...prev, [block.groupId!]: p.performance.id })) : undefined
                        }
                        className={`font-medium text-slate-100 ${block.groupId ? "cursor-pointer" : ""}`}
                      >
                        {p.exercise?.name ?? "Exercise"}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {canSwap && p.exercise && (
                        <button
                          onClick={() => setSwappingPerformance(p)}
                          className="text-xs font-medium text-sky-400 active:text-sky-300"
                        >
                          Swap
                        </button>
                      )}
                      <button
                        onClick={() => moveEntry(performanceIndex.get(p.performance.id)!, "up")}
                        disabled={!canMoveEntry(performanceIndex.get(p.performance.id)!, "up")}
                        aria-label="Move up"
                        className="text-slate-500 active:text-slate-300 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => moveEntry(performanceIndex.get(p.performance.id)!, "down")}
                        disabled={!canMoveEntry(performanceIndex.get(p.performance.id)!, "down")}
                        aria-label="Move down"
                        className="text-slate-500 active:text-slate-300 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {sortedSets.map((set, index) => {
                      // Derived from each set's own isCompleted rather than its position, so
                      // undoing an earlier set while a later one is still logged (a "hole" in
                      // the sequence) still shows the later set as completed, not pending.
                      const status: SetStatus = set.isCompleted ? "completed" : index === activeIndex ? "active" : "pending";
                      return (
                        <SetRow
                          key={set.id}
                          set={set}
                          status={status}
                          isHoldMode={isHoldMode}
                          canAct={canAct}
                          onUndo={() => void handleUndoSet(set)}
                          onRemove={() => void handleRemoveSet(set)}
                          onLogHold={(holdSeconds) => void logSet(block.groupId ? block.members : undefined, p, set, { holdSeconds })}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => void handleAddSet(p.performance.id)}
                      className="text-xs font-medium text-sky-400 active:text-sky-300"
                    >
                      + Add Set
                    </button>
                  </div>

                  <div className="mt-2">
                    {isExerciseLogged ? (
                      <span className="block w-full rounded-lg bg-emerald-500/15 py-3 text-center text-base font-medium text-emerald-400">
                        ✓ Exercise Complete
                      </span>
                    ) : isHoldMode ? null : !canAct ? (
                      <span className="block w-full rounded-lg bg-slate-700 py-3 text-center text-base text-slate-400">Up next</span>
                    ) : (
                      <button
                        onClick={() => void logSet(block.groupId ? block.members : undefined, p, sortedSets[activeIndex])}
                        className="w-full rounded-lg bg-sky-500 py-3 text-base font-semibold text-slate-950 active:bg-sky-400"
                      >
                        {isFinalSet ? "Log Exercise" : "Log Set"}
                      </button>
                    )}
                  </div>
                </div>
              );
            });

            if (!block.groupId) return cards[0];

            return (
              <div key={block.groupId} className="flex flex-col gap-2 rounded-xl p-2 ring-2 ring-amber-500/40">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-amber-400">Superset</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => moveGroup(performanceIndex.get(block.members[0].performance.id)!, "up")}
                      disabled={blockRange(performances, performanceIndex.get(block.members[0].performance.id)!)[0] === 0}
                      aria-label="Move superset up"
                      className="text-xs font-medium text-slate-500 active:text-slate-300 disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveGroup(performanceIndex.get(block.members[0].performance.id)!, "down")}
                      disabled={
                        blockRange(performances, performanceIndex.get(block.members[0].performance.id)!)[1] === performances.length
                      }
                      aria-label="Move superset down"
                      className="text-xs font-medium text-slate-500 active:text-slate-300 disabled:opacity-30"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => void disbandSuperset(sessionId, block.groupId!)}
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
          className="mt-4 w-full rounded-xl border border-dashed border-slate-700 py-3 font-medium text-sky-400 active:bg-slate-800"
        >
          + Add Exercise
        </button>

        <button
          onClick={() => void handleFinish()}
          disabled={isSaving}
          className="mt-4 w-full rounded-xl bg-sky-500 py-4 text-lg font-semibold text-slate-950 active:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500"
        >
          Finish Workout
        </button>
      </div>

      {isSaving && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60">
          <div className="rounded-xl bg-slate-800 px-4 py-3 text-slate-100">Saving…</div>
        </div>
      )}

      {isRatingEffort && <EffortRatingModal sessionId={sessionId} onDone={onDone} />}

      {isPicking && (
        <ExercisePicker
          availableEquipmentIds={availableEquipmentIds}
          onSelect={(exercise) => void handleAddExercise(exercise)}
          onClose={() => setIsPicking(false)}
        />
      )}

      {swappingPerformance?.exercise && (
        <ExerciseSwapPicker
          currentExercise={swappingPerformance.exercise}
          availableEquipmentIds={availableEquipmentIds}
          onSelect={(exercise) => void handleSwapSelect(exercise)}
          onClose={() => setSwappingPerformance(null)}
        />
      )}

      {restEndsAt !== null && (
        <RestTimer
          endsAt={restEndsAt}
          onAdjust={(deltaMs) => setRestEndsAt((prev) => (prev !== null ? prev + deltaMs : prev))}
          onDismiss={() => setRestEndsAt(null)}
        />
      )}

      {detailExercise && <ExerciseDetailModal exercise={detailExercise} onClose={() => setDetailExercise(null)} />}
    </div>
  );
}

function SetRow({
  set,
  status,
  isHoldMode,
  canAct,
  onUndo,
  onRemove,
  onLogHold,
}: {
  set: SetEntry;
  status: SetStatus;
  isHoldMode: boolean;
  canAct: boolean;
  onUndo: () => void;
  onRemove: () => void;
  onLogHold: (holdSeconds: number) => void;
}) {
  return (
    <div className={`flex items-center gap-2 ${status === "pending" ? "opacity-40" : "opacity-100"}`}>
      <input
        type="number"
        inputMode="decimal"
        value={set.weight === 0 ? "" : set.weight}
        placeholder="0"
        onChange={(e) => void updateSetWithCascade(set.id, { weight: Number(e.target.value) || 0 })}
        className="w-16 rounded-lg bg-slate-900 px-2 py-1.5 text-center text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
      />
      <span className="text-xs text-slate-500">lb</span>

      {isHoldMode ? (
        status === "active" && canAct ? (
          <HoldStopwatch initialSeconds={set.holdSeconds ?? 30} onComplete={onLogHold} />
        ) : (
          <span className="w-24 text-center text-sm tabular-nums text-slate-400">
            {status === "completed" ? formatElapsed(set.holdSeconds ?? 0) : formatElapsed(set.holdSeconds ?? 30)}
            {status === "active" ? " · up next" : ""}
          </span>
        )
      ) : (
        <>
          <input
            type="number"
            inputMode="numeric"
            value={set.reps === 0 ? "" : set.reps}
            placeholder="0"
            onChange={(e) => void updateSetWithCascade(set.id, { reps: Number(e.target.value) || 0 })}
            className="w-14 rounded-lg bg-slate-900 px-2 py-1.5 text-center text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          />
          <span className="text-xs text-slate-500">reps</span>
        </>
      )}

      {status === "completed" ? (
        <button
          onClick={onUndo}
          aria-label="Mark incomplete"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-lg text-slate-950"
        >
          ✓
        </button>
      ) : (
        <span className="ml-auto w-8" />
      )}
      <button onClick={onRemove} aria-label="Remove set" className="text-slate-500 active:text-red-400">
        ✕
      </button>
    </div>
  );
}
