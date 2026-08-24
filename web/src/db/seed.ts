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

/** Loads the bundled equipment + exercise library into IndexedDB the first time the app runs. */
export async function seedIfNeeded(): Promise<void> {
  const equipmentCount = await db.equipment.count();
  const equipmentByName = new Map<string, string>();

  if (equipmentCount === 0) {
    const rows = (equipmentSeed as SeedEquipment[]).map((item) => {
      const id = newId();
      equipmentByName.set(item.name, id);
      return { id, name: item.name, category: item.category, isCustom: false };
    });
    await db.equipment.bulkAdd(rows);
  } else {
    for (const row of await db.equipment.toArray()) {
      equipmentByName.set(row.name, row.id);
    }
  }

  const exerciseCount = await db.exercises.count();
  if (exerciseCount === 0) {
    const rows = (exercisesSeed as SeedExercise[]).map((item) => ({
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

  const gymCount = await db.gyms.count();
  if (gymCount === 0) {
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
}
