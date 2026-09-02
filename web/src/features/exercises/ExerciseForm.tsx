import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";
import { addCustomEquipment, createCustomExercise, updateExercise } from "../../db/repo";
import type { Exercise } from "../../types/exercise";
import { EXERCISE_CATEGORIES, type ExerciseCategory } from "../../types/exercise";
import { EQUIPMENT_CATEGORIES, equipmentCategoryDisplayName } from "../../types/equipment";
import { MUSCLE_GROUPS, muscleDisplayName, type MuscleGroup } from "../../types/muscleGroup";

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  compound: "Compound",
  isolation: "Isolation",
  cardio: "Cardio",
};

interface Props {
  initialExercise?: Exercise;
  onDone: () => void;
}

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function ExerciseForm({ initialExercise, onDone }: Props) {
  const isEditing = !!initialExercise;
  const allEquipment = useLiveQuery(() => db.equipment.orderBy("name").toArray(), []) ?? [];
  const [name, setName] = useState(initialExercise?.name ?? "");
  const [category, setCategory] = useState<ExerciseCategory>(initialExercise?.category ?? "compound");
  const [primaryMuscles, setPrimaryMuscles] = useState<Set<MuscleGroup>>(new Set(initialExercise?.primaryMuscles ?? []));
  const [secondaryMuscles, setSecondaryMuscles] = useState<Set<MuscleGroup>>(new Set(initialExercise?.secondaryMuscles ?? []));
  const [equipmentIds, setEquipmentIds] = useState<Set<string>>(new Set(initialExercise?.equipmentIds ?? []));
  const [isHold, setIsHold] = useState(initialExercise?.defaultLogMode === "hold");
  const [instructions, setInstructions] = useState(initialExercise?.instructions ?? "");
  const [linkUrl, setLinkUrl] = useState(initialExercise?.linkUrl ?? "");
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const groupedEquipment = useMemo(() => {
    return EQUIPMENT_CATEGORIES.map((cat) => ({
      category: cat,
      items: allEquipment.filter((item) => item.category === cat),
    })).filter((group) => group.items.length > 0);
  }, [allEquipment]);

  const canSave = name.trim().length > 0 && primaryMuscles.size > 0;

  async function handleAddEquipment() {
    const trimmed = newEquipmentName.trim();
    setNewEquipmentName("");
    setIsAddingEquipment(false);
    if (!trimmed) return;
    const equipment = await addCustomEquipment(trimmed);
    setEquipmentIds((prev) => new Set(prev).add(equipment.id));
  }

  async function handleSave() {
    if (!canSave) return;
    setIsSaving(true);
    const fields = {
      name: name.trim(),
      primaryMuscles: [...primaryMuscles],
      secondaryMuscles: [...secondaryMuscles],
      category,
      equipmentIds: [...equipmentIds],
      defaultLogMode: isHold ? ("hold" as const) : undefined,
      instructions: instructions.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
    };
    if (initialExercise) {
      await updateExercise(initialExercise.id, fields);
    } else {
      await createCustomExercise(fields);
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-slate-100">{isEditing ? "Edit Exercise" : "Add Exercise"}</h2>
        <button onClick={onDone} className="text-sm font-medium text-slate-400 active:text-slate-200">
          Cancel
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 pb-8">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Exercise name"
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExerciseCategory)}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700"
          >
            {EXERCISE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Primary Muscles</label>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((muscle) => (
              <button
                key={muscle}
                onClick={() => setPrimaryMuscles((prev) => toggle(prev, muscle))}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  primaryMuscles.has(muscle) ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-200 active:bg-slate-700"
                }`}
              >
                {muscleDisplayName(muscle)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Secondary Muscles</label>
          <div className="flex flex-wrap gap-2">
            {MUSCLE_GROUPS.map((muscle) => (
              <button
                key={muscle}
                onClick={() => setSecondaryMuscles((prev) => toggle(prev, muscle))}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  secondaryMuscles.has(muscle) ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-200 active:bg-slate-700"
                }`}
              >
                {muscleDisplayName(muscle)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Equipment</label>
            <button onClick={() => setIsAddingEquipment(true)} className="text-xs font-medium text-sky-400 active:text-sky-300">
              + Custom
            </button>
          </div>

          {isAddingEquipment && (
            <div className="mb-3 flex gap-2 rounded-xl bg-slate-800 p-3">
              <input
                autoFocus
                value={newEquipmentName}
                onChange={(e) => setNewEquipmentName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleAddEquipment()}
                placeholder="Equipment name"
                className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
              />
              <button onClick={() => void handleAddEquipment()} className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950">
                Add
              </button>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {groupedEquipment.map(({ category: cat, items }) => (
              <div key={cat}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {equipmentCategoryDisplayName(cat)}
                </h3>
                <div className="flex flex-col gap-1 rounded-xl bg-slate-800">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center justify-between border-b border-slate-700/60 px-4 py-2.5 last:border-b-0"
                    >
                      <span className="text-slate-100">{item.name}</span>
                      <input
                        type="checkbox"
                        checked={equipmentIds.has(item.id)}
                        onChange={() => setEquipmentIds((prev) => toggle(prev, item.id))}
                        className="h-5 w-5 accent-sky-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2.5">
          <span className="text-sm text-slate-200">Logged as a timed hold instead of reps</span>
          <input
            type="checkbox"
            checked={isHold}
            onChange={(e) => setIsHold(e.target.checked)}
            className="h-5 w-5 accent-sky-500"
          />
        </label>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Instructions (optional, one step per line)
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder={"• Step one\n• Step two\n• Step three"}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Link (optional)</label>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          />
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() => void handleSave()}
          disabled={!canSave || isSaving}
          className="w-full rounded-xl bg-sky-500 py-4 text-lg font-semibold text-slate-950 active:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500"
        >
          {isEditing ? "Save Changes" : "Save Exercise"}
        </button>
      </div>
    </div>
  );
}
