export const EQUIPMENT_CATEGORIES = [
  "freeWeight",
  "machine",
  "cable",
  "bodyweight",
  "band",
  "bench",
  "cardio",
  "other",
] as const;

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number];

const DISPLAY_NAMES: Record<EquipmentCategory, string> = {
  freeWeight: "Free Weight",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  band: "Band",
  bench: "Bench",
  cardio: "Cardio",
  other: "Other",
};

export function equipmentCategoryDisplayName(category: EquipmentCategory): string {
  return DISPLAY_NAMES[category];
}

export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  isCustom: boolean;
}
