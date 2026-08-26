import Dexie, { type EntityTable } from "dexie";
import type { Equipment } from "../types/equipment";
import type { Exercise } from "../types/exercise";
import type { Gym } from "../types/gym";
import type { Routine } from "../types/routine";
import type { Profile } from "../types/profile";
import type { WorkoutSession, ExercisePerformance, SetEntry } from "../types/workoutSession";
import type { ActivityType, Activity } from "../types/activity";

export class WorkoutDatabase extends Dexie {
  equipment!: EntityTable<Equipment, "id">;
  exercises!: EntityTable<Exercise, "id">;
  gyms!: EntityTable<Gym, "id">;
  routines!: EntityTable<Routine, "id">;
  profile!: EntityTable<Profile, "id">;
  sessions!: EntityTable<WorkoutSession, "id">;
  performances!: EntityTable<ExercisePerformance, "id">;
  sets!: EntityTable<SetEntry, "id">;
  activityTypes!: EntityTable<ActivityType, "id">;
  activities!: EntityTable<Activity, "id">;

  constructor() {
    super("workout-app");

    this.version(1).stores({
      equipment: "id, name, category",
      exercises: "id, name, category",
      gyms: "id, name, createdAt",
      // isCompleted is intentionally not indexed: IndexedDB keys can't be booleans,
      // so completed sessions are filtered in JS after an indexed `date` query.
      sessions: "id, date, gymId",
      performances: "id, sessionId, exerciseId, orderIndex",
      sets: "id, performanceId, setNumber",
    });

    this.version(2).stores({
      routines: "id, name, createdAt",
    });

    this.version(3).stores({
      profile: "id",
    });

    this.version(4).stores({
      activityTypes: "id, name",
      activities: "id, date, activityTypeId",
    });
  }
}

export const db = new WorkoutDatabase();

export function newId(): string {
  return crypto.randomUUID();
}
