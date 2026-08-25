import { db, newId } from "./schema";
import type { Equipment, EquipmentCategory } from "../types/equipment";
import type { Exercise } from "../types/exercise";
import type { Gym } from "../types/gym";
import type { Routine, RoutineExerciseEntry } from "../types/routine";
import type { Profile } from "../types/profile";
import type { ExercisePerformance, SetEntry, WorkoutSession } from "../types/workoutSession";
import type { MuscleGroup } from "../types/muscleGroup";
import { nextTarget } from "../domain/progression";
import { groupTogether } from "../domain/superset";

// ---- Profile ----

const PROFILE_ID = "singleton";

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get(PROFILE_ID);
}

export async function setProfileAge(age: number): Promise<void> {
  await db.profile.put({ id: PROFILE_ID, age });
}

// ---- Equipment ----

export async function addCustomEquipment(name: string, category: EquipmentCategory = "other"): Promise<Equipment> {
  const equipment: Equipment = { id: newId(), name, category, isCustom: true };
  await db.equipment.add(equipment);
  return equipment;
}

// ---- Gyms ----

export async function createGym(name: string): Promise<Gym> {
  const gym: Gym = {
    id: newId(),
    name,
    isDefault: false,
    equipmentIds: [],
    createdAt: new Date().toISOString(),
  };
  await db.gyms.add(gym);
  return gym;
}

export async function deleteGym(id: string): Promise<void> {
  await db.gyms.delete(id);
}

export async function setGymEquipment(gymId: string, equipmentIds: string[]): Promise<void> {
  await db.gyms.update(gymId, { equipmentIds });
}

export async function renameGym(gymId: string, name: string): Promise<void> {
  await db.gyms.update(gymId, { name });
}

// ---- Planning + starting a workout ----

export interface PlannedExercise {
  exercise: Exercise;
  targetSets: number;
  targetReps: number;
  targetWeight?: number;
  logMode?: "reps" | "hold"; // undefined = reps
  targetHoldSeconds?: number; // only meaningful when logMode === "hold"
  groupId?: string; // superset group id, shared across members
}

/**
 * Creates a session with one ExercisePerformance per planned exercise and
 * pre-populated (uncompleted) SetEntry rows for the target set count.
 */
export async function startWorkout(
  gymId: string | undefined,
  plan: PlannedExercise[],
  routineId?: string,
): Promise<string> {
  const sessionId = newId();
  const session: WorkoutSession = {
    id: sessionId,
    date: new Date().toISOString(),
    duration: 0,
    isCompleted: false,
    gymId,
    routineId,
  };

  const performances: ExercisePerformance[] = [];
  const sets: SetEntry[] = [];

  plan.forEach((planned, index) => {
    const performanceId = newId();
    const isHold = planned.logMode === "hold";
    performances.push({
      id: performanceId,
      sessionId,
      exerciseId: planned.exercise.id,
      orderIndex: index,
      logMode: planned.logMode,
      groupId: planned.groupId,
    });
    for (let setNumber = 1; setNumber <= planned.targetSets; setNumber++) {
      sets.push({
        id: newId(),
        performanceId,
        setNumber,
        weight: planned.targetWeight ?? 0,
        reps: isHold ? 0 : planned.targetReps,
        holdSeconds: isHold ? (planned.targetHoldSeconds ?? 30) : undefined,
        isCompleted: false,
      });
    }
  });

  await db.transaction("rw", db.sessions, db.performances, db.sets, async () => {
    await db.sessions.add(session);
    await db.performances.bulkAdd(performances);
    await db.sets.bulkAdd(sets);
  });

  return sessionId;
}

/**
 * The session currently in progress, if any. Used to resume straight into ActiveWorkout
 * after a reload — e.g. iOS discarding a backgrounded tab mid-workout — since the row
 * itself (and everything logged against it) is already durably in IndexedDB regardless
 * of what any in-memory UI state remembers.
 */
export async function findActiveSession(): Promise<WorkoutSession | undefined> {
  const incomplete = await db.sessions.filter((session) => !session.isCompleted).toArray();
  if (incomplete.length === 0) return undefined;
  return incomplete.sort((a, b) => b.date.localeCompare(a.date))[0];
}

export async function updateSet(
  setId: string,
  changes: Partial<Pick<SetEntry, "weight" | "reps" | "isCompleted" | "rpe" | "holdSeconds">>,
): Promise<void> {
  await db.sets.update(setId, changes);
}

/** Appends a new exercise to an already-started session, e.g. from the "+ Add Exercise" button mid-workout. */
export async function addExerciseToSession(
  sessionId: string,
  exercise: Exercise,
  targetSets = 3,
  targetReps = 10,
): Promise<void> {
  const existing = await db.performances.where("sessionId").equals(sessionId).toArray();
  const performanceId = newId();
  const isHold = exercise.defaultLogMode === "hold";
  const performance: ExercisePerformance = {
    id: performanceId,
    sessionId,
    exerciseId: exercise.id,
    orderIndex: existing.length,
    logMode: isHold ? "hold" : undefined,
  };
  const sets: SetEntry[] = [];
  for (let setNumber = 1; setNumber <= targetSets; setNumber++) {
    sets.push({
      id: newId(),
      performanceId,
      setNumber,
      weight: 0,
      reps: isHold ? 0 : targetReps,
      holdSeconds: isHold ? 30 : undefined,
      isCompleted: false,
    });
  }

  await db.transaction("rw", db.performances, db.sets, async () => {
    await db.performances.add(performance);
    await db.sets.bulkAdd(sets);
  });
}

/**
 * Replaces the exercise in an existing performance with a different one — only meaningful
 * before any of its sets are logged, since the old exercise's weight doesn't carry over.
 */
export async function swapExerciseInPerformance(performanceId: string, newExercise: Exercise): Promise<void> {
  await db.transaction("rw", db.performances, db.sets, async () => {
    await db.performances.update(performanceId, { exerciseId: newExercise.id });
    const sets = await db.sets.where("performanceId").equals(performanceId).toArray();
    await Promise.all(sets.map((set) => db.sets.update(set.id, { weight: 0 })));
  });
}

/** Appends one more set to an in-progress exercise, pre-filled from the current last set. */
export async function addSetToPerformance(performanceId: string): Promise<void> {
  const sets = await db.sets.where("performanceId").equals(performanceId).toArray();
  const lastSet = sets.length > 0 ? sets.reduce((a, b) => (a.setNumber > b.setNumber ? a : b)) : undefined;

  await db.sets.add({
    id: newId(),
    performanceId,
    setNumber: (lastSet?.setNumber ?? 0) + 1,
    weight: lastSet?.weight ?? 0,
    reps: lastSet?.reps ?? 10,
    holdSeconds: lastSet?.holdSeconds,
    isCompleted: false,
  });
}

export async function finishWorkout(sessionId: string, duration: number): Promise<void> {
  await db.sessions.update(sessionId, { duration, isCompleted: true });
  await applyProgressionIfApplicable(sessionId);
}

/**
 * If this session was started from a routine with smart-adjust on, updates that
 * routine's stored weight/rep target per exercise based on what was actually logged.
 */
async function applyProgressionIfApplicable(sessionId: string): Promise<void> {
  const session = await db.sessions.get(sessionId);
  if (!session?.routineId) return;

  const routine = await db.routines.get(session.routineId);
  if (!routine || !routine.smartAdjustEnabled) return;

  const performances = await db.performances.where("sessionId").equals(sessionId).toArray();
  const performanceIds = performances.map((p) => p.id);
  const allSets =
    performanceIds.length > 0 ? await db.sets.where("performanceId").anyOf(performanceIds).toArray() : [];

  const setsByExerciseId = new Map<string, SetEntry[]>();
  for (const performance of performances) {
    const sets = allSets.filter((s) => s.performanceId === performance.id);
    setsByExerciseId.set(performance.exerciseId, sets);
  }

  const updatedExercises: RoutineExerciseEntry[] = routine.exercises.map((entry) => {
    if (entry.logMode === "hold") return entry; // reps-based double progression doesn't apply
    const loggedSets = setsByExerciseId.get(entry.exerciseId);
    if (!loggedSets || loggedSets.length === 0) return entry;

    // Progress from the weight actually used this session, not the routine's stale stored
    // weight, since the user may have adjusted it live during the workout.
    const weightUsed = Math.max(...loggedSets.map((set) => set.weight));

    const next = nextTarget(
      loggedSets.map((set) => ({ reps: set.reps, isCompleted: set.isCompleted })),
      {
        weight: weightUsed,
        repsMin: entry.targetRepsMin,
        repsMax: entry.targetRepsMax,
        targetReps: entry.currentTargetReps,
      },
    );

    return { ...entry, currentWeight: next.weight, currentTargetReps: next.targetReps };
  });

  await db.routines.update(routine.id, { exercises: updatedExercises });
}

/**
 * Bundles 2+ existing performances in an in-progress session into a superset group,
 * reordering them to be contiguous at the earliest member's original position — this is
 * what lets both rendering and rotation math treat a group as one simple contiguous block.
 */
export async function makeSuperset(sessionId: string, performanceIds: string[]): Promise<void> {
  const performances = await db.performances.where("sessionId").equals(sessionId).sortBy("orderIndex");
  const idSet = new Set(performanceIds);
  const selectedIndexes = new Set(performances.map((p, i) => (idSet.has(p.id) ? i : -1)).filter((i) => i >= 0));
  const reordered = groupTogether(performances, selectedIndexes);
  const groupId = newId();

  await db.transaction("rw", db.performances, async () => {
    await Promise.all(
      reordered.map((p, index) =>
        db.performances.update(p.id, {
          orderIndex: index,
          groupId: idSet.has(p.id) ? groupId : p.groupId,
        }),
      ),
    );
  });
}

/** Removes the grouping; members keep their current positions. */
export async function disbandSuperset(sessionId: string, groupId: string): Promise<void> {
  const members = await db.performances
    .where("sessionId")
    .equals(sessionId)
    .filter((p) => p.groupId === groupId)
    .toArray();
  await Promise.all(members.map((p) => db.performances.update(p.id, { groupId: undefined })));
}

export async function discardWorkout(sessionId: string): Promise<void> {
  const performances = await db.performances.where("sessionId").equals(sessionId).toArray();
  const performanceIds = performances.map((p) => p.id);

  await db.transaction("rw", db.sessions, db.performances, db.sets, async () => {
    if (performanceIds.length > 0) {
      await db.sets.where("performanceId").anyOf(performanceIds).delete();
    }
    await db.performances.where("sessionId").equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

export async function deleteWorkout(sessionId: string): Promise<void> {
  await discardWorkout(sessionId);
}

// ---- Routines ----

export async function saveAsRoutine(
  name: string,
  plan: PlannedExercise[],
  smartAdjustEnabled: boolean,
): Promise<Routine> {
  const routine: Routine = {
    id: newId(),
    name,
    createdAt: new Date().toISOString(),
    smartAdjustEnabled,
    exercises: plan.map((planned, index) => ({
      exerciseId: planned.exercise.id,
      orderIndex: index,
      targetSets: planned.targetSets,
      targetRepsMin: planned.targetReps,
      targetRepsMax: planned.targetReps,
      currentTargetReps: planned.targetReps,
      currentWeight: planned.targetWeight ?? 0,
      logMode: planned.logMode,
      targetHoldSeconds: planned.targetHoldSeconds,
      groupId: planned.groupId,
    })),
  };
  await db.routines.add(routine);
  return routine;
}

export async function renameRoutine(routineId: string, name: string): Promise<void> {
  await db.routines.update(routineId, { name });
}

export async function setRoutineSmartAdjust(routineId: string, smartAdjustEnabled: boolean): Promise<void> {
  await db.routines.update(routineId, { smartAdjustEnabled });
}

export async function updateRoutineExercises(routineId: string, exercises: RoutineExerciseEntry[]): Promise<void> {
  await db.routines.update(routineId, { exercises });
}

export async function deleteRoutine(routineId: string): Promise<void> {
  await db.routines.delete(routineId);
}

/** Resolves a routine's stored exercise entries into the PlannedExercise[] shape BuildWorkout consumes. */
export async function loadPlannedExercisesFromRoutine(routineId: string): Promise<PlannedExercise[]> {
  const routine = await db.routines.get(routineId);
  if (!routine) return [];

  const sorted = [...routine.exercises].sort((a, b) => a.orderIndex - b.orderIndex);
  const exercises = await db.exercises.bulkGet(sorted.map((entry) => entry.exerciseId));

  const planned: PlannedExercise[] = [];
  sorted.forEach((entry, index) => {
    const exercise = exercises[index];
    if (!exercise) return;
    planned.push({
      exercise,
      targetSets: entry.targetSets,
      targetReps: entry.currentTargetReps,
      targetWeight: entry.currentWeight,
      logMode: entry.logMode,
      targetHoldSeconds: entry.targetHoldSeconds,
      groupId: entry.groupId,
    });
  });
  return planned;
}

// ---- Reading a session in detail ----

export interface PerformanceDetail {
  performance: ExercisePerformance;
  exercise: Exercise | undefined;
  sets: SetEntry[];
}

export interface SessionDetail {
  session: WorkoutSession;
  gym: Gym | undefined;
  performances: PerformanceDetail[];
}

export async function loadSessionDetail(sessionId: string): Promise<SessionDetail | undefined> {
  const session = await db.sessions.get(sessionId);
  if (!session) return undefined;

  const [performances, gym] = await Promise.all([
    db.performances.where("sessionId").equals(sessionId).sortBy("orderIndex"),
    session.gymId ? db.gyms.get(session.gymId) : Promise.resolve(undefined),
  ]);

  const performanceIds = performances.map((p) => p.id);
  const [allSets, exercises] = await Promise.all([
    performanceIds.length > 0 ? db.sets.where("performanceId").anyOf(performanceIds).toArray() : Promise.resolve<SetEntry[]>([]),
    db.exercises.bulkGet(performances.map((p) => p.exerciseId)),
  ]);

  const exerciseById = new Map(exercises.filter((e): e is Exercise => !!e).map((e) => [e.id, e]));
  const setsByPerformance = new Map<string, SetEntry[]>();
  for (const set of allSets) {
    const list = setsByPerformance.get(set.performanceId) ?? [];
    list.push(set);
    setsByPerformance.set(set.performanceId, list);
  }

  return {
    session,
    gym,
    performances: performances.map((performance) => ({
      performance,
      exercise: exerciseById.get(performance.exerciseId),
      sets: (setsByPerformance.get(performance.id) ?? []).sort((a, b) => a.setNumber - b.setNumber),
    })),
  };
}

export function sessionTotalVolume(detail: SessionDetail): number {
  return detail.performances.reduce(
    (total, p) => total + p.sets.reduce((sum, set) => sum + (set.isCompleted ? set.weight * set.reps : 0), 0),
    0,
  );
}

export function sessionMuscleSummary(detail: SessionDetail): MuscleGroup[] {
  const counts = new Map<MuscleGroup, number>();
  for (const p of detail.performances) {
    if (!p.exercise) continue;
    for (const muscle of p.exercise.primaryMuscles) {
      counts.set(muscle, (counts.get(muscle) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([muscle]) => muscle);
}
