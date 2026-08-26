import { db, newId } from "./schema";
import type { EquipmentCategory } from "../types/equipment";
import type { ExerciseCategory } from "../types/exercise";
import type { MuscleGroup } from "../types/muscleGroup";
import equipmentSeed from "./seedData/equipment.json";
import exercisesSeed from "./seedData/exercises.json";
import activityTypesSeed from "./seedData/activityTypes.json";

interface SeedEquipment {
  name: string;
  category: EquipmentCategory;
}

interface SeedActivityType {
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
}

interface SeedExercise {
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  category: ExerciseCategory;
  equipment: string[];
  defaultLogMode?: "hold";
  media?: string;
}

const HOLD_MODE_EXERCISE_NAMES = ["Plank", "Side Plank", "Dead Hang"];

const HOME_EQUIPMENT_NAMES = new Set(["Bodyweight", "Dumbbell", "Pull-up Bar", "Resistance Band"]);

/**
 * Loads the bundled equipment + exercise library into IndexedDB. Additive by name rather than
 * "only seed if empty," so library updates (new exercises/equipment added later) reach browsers
 * that already have data, without touching anything a user has customized or logged.
 */
export async function seedIfNeeded(): Promise<void> {
  const equipmentByName = await seedEquipment();
  await seedExercises(equipmentByName);
  await backfillHoldModeFlags();
  await backfillMediaUrls();
  await seedDefaultGym(equipmentByName);
  await seedActivityTypes();
}

async function seedActivityTypes(): Promise<void> {
  const existingNames = new Set((await db.activityTypes.toArray()).map((row) => row.name));
  const missing = (activityTypesSeed as SeedActivityType[]).filter((item) => !existingNames.has(item.name));
  if (missing.length === 0) return;

  const rows = missing.map((item) => ({
    id: newId(),
    name: item.name,
    primaryMuscles: item.primaryMuscles,
    secondaryMuscles: item.secondaryMuscles,
  }));
  await db.activityTypes.bulkAdd(rows);
}

async function seedEquipment(): Promise<Map<string, string>> {
  const existing = await db.equipment.toArray();
  const equipmentByName = new Map(existing.map((row) => [row.name, row.id]));

  const missing = (equipmentSeed as SeedEquipment[]).filter((item) => !equipmentByName.has(item.name));
  if (missing.length > 0) {
    const rows = missing.map((item) => {
      const id = newId();
      equipmentByName.set(item.name, id);
      return { id, name: item.name, category: item.category, isCustom: false };
    });
    await db.equipment.bulkAdd(rows);
  }

  return equipmentByName;
}

async function seedExercises(equipmentByName: Map<string, string>): Promise<void> {
  const existingNames = new Set((await db.exercises.toArray()).map((row) => row.name));
  const missing = (exercisesSeed as SeedExercise[]).filter((item) => !existingNames.has(item.name));
  if (missing.length === 0) return;

  const rows = missing.map((item) => ({
    id: newId(),
    name: item.name,
    primaryMuscles: item.primaryMuscles,
    secondaryMuscles: item.secondaryMuscles,
    category: item.category,
    equipmentIds: item.equipment.map((name) => equipmentByName.get(name)).filter((id): id is string => !!id),
    isCustom: false,
    defaultLogMode: item.defaultLogMode,
    mediaUrl: item.media,
  }));
  await db.exercises.bulkAdd(rows);
}

/**
 * Seeding is additive-by-name and skips any exercise that already exists, so a browser that
 * seeded Plank/Dead Hang/Side Plank before this flag existed would never pick it up from the
 * JSON alone. Idempotent, and only ever touches this one field on exact-name matches.
 */
async function backfillHoldModeFlags(): Promise<void> {
  const rows = await db.exercises.where("name").anyOf(HOLD_MODE_EXERCISE_NAMES).toArray();
  const needsUpdate = rows.filter((row) => row.defaultLogMode !== "hold");
  await Promise.all(needsUpdate.map((row) => db.exercises.update(row.id, { defaultLogMode: "hold" })));
}

/**
 * Syncs `mediaUrl` from the seed data onto existing rows by name — exercises seeded before
 * an image was curated for them would otherwise never pick it up, since seeding only inserts
 * missing rows. Idempotent; only writes when the seed value actually differs from what's stored.
 */
async function backfillMediaUrls(): Promise<void> {
  const withMedia = (exercisesSeed as SeedExercise[]).filter((item) => item.media);
  if (withMedia.length === 0) return;

  const mediaByName = new Map(withMedia.map((item) => [item.name, item.media]));
  const rows = await db.exercises.where("name").anyOf([...mediaByName.keys()]).toArray();
  const needsUpdate = rows.filter((row) => row.mediaUrl !== mediaByName.get(row.name));
  await Promise.all(needsUpdate.map((row) => db.exercises.update(row.id, { mediaUrl: mediaByName.get(row.name) })));
}

async function seedDefaultGym(equipmentByName: Map<string, string>): Promise<void> {
  const gymCount = await db.gyms.count();
  if (gymCount > 0) return;

  const homeEquipmentIds = [...equipmentByName.entries()]
    .filter(([name]) => HOME_EQUIPMENT_NAMES.has(name))
    .map(([, id]) => id);

  await db.gyms.add({
    id: newId(),
    name: "Home",
    isDefault: true,
    equipmentIds: homeEquipmentIds,
    createdAt: new Date().toISOString(),
  });
}
