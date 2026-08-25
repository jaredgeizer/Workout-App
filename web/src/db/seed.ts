import { db, newId } from "./schema";
import type { EquipmentCategory } from "../types/equipment";
import type { ExerciseCategory } from "../types/exercise";
import type { MuscleGroup } from "../types/muscleGroup";
import equipmentSeed from "./seedData/equipment.json";
import exercisesSeed from "./seedData/exercises.json";

interface SeedEquipment {
  name: string;
  category: EquipmentCategory;
}

interface SeedExercise {
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  category: ExerciseCategory;
  equipment: string[];
}

const HOME_EQUIPMENT_NAMES = new Set(["Bodyweight", "Dumbbell", "Pull-up Bar", "Resistance Band"]);

/**
 * Loads the bundled equipment + exercise library into IndexedDB. Additive by name rather than
 * "only seed if empty," so library updates (new exercises/equipment added later) reach browsers
 * that already have data, without touching anything a user has customized or logged.
 */
export async function seedIfNeeded(): Promise<void> {
  const equipmentByName = await seedEquipment();
  await seedExercises(equipmentByName);
  await seedDefaultGym(equipmentByName);
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
  }));
  await db.exercises.bulkAdd(rows);
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
