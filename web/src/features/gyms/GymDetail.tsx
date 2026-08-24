import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";
import type { Gym } from "../../types/gym";
import { EQUIPMENT_CATEGORIES, equipmentCategoryDisplayName } from "../../types/equipment";
import { addCustomEquipment, renameGym, setGymEquipment } from "../../db/repo";

interface Props {
  gym: Gym;
  onBack: () => void;
}

export function GymDetail({ gym, onBack }: Props) {
  const allEquipment = useLiveQuery(() => db.equipment.orderBy("name").toArray(), []) ?? [];
  const [isAddingEquipment, setIsAddingEquipment] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");

  const selectedIds = useMemo(() => new Set(gym.equipmentIds), [gym.equipmentIds]);

  const grouped = useMemo(() => {
    return EQUIPMENT_CATEGORIES.map((category) => ({
      category,
      items: allEquipment.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [allEquipment]);

  function toggle(equipmentId: string) {
    const next = new Set(selectedIds);
    if (next.has(equipmentId)) {
      next.delete(equipmentId);
    } else {
      next.add(equipmentId);
    }
    void setGymEquipment(gym.id, [...next]);
  }

  async function handleAddEquipment() {
    const trimmed = newEquipmentName.trim();
    setNewEquipmentName("");
    setIsAddingEquipment(false);
    if (!trimmed) return;
    const equipment = await addCustomEquipment(trimmed);
    void setGymEquipment(gym.id, [...selectedIds, equipment.id]);
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-2xl text-slate-400 active:text-slate-200" aria-label="Back">
          ‹
        </button>
        <input
          value={gym.name}
          onChange={(e) => void renameGym(gym.id, e.target.value)}
          className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-lg font-semibold text-slate-100 outline-none ring-1 ring-transparent focus:ring-sky-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-400">Equipment</h2>
        <button onClick={() => setIsAddingEquipment(true)} className="text-sm font-medium text-sky-400 active:text-sky-300">
          + Custom
        </button>
      </div>

      {isAddingEquipment && (
        <div className="flex gap-2 rounded-xl bg-slate-800 p-3">
          <input
            autoFocus
            value={newEquipmentName}
            onChange={(e) => setNewEquipmentName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddEquipment()}
            placeholder="Equipment name"
            className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          />
          <button onClick={handleAddEquipment} className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950">
            Add
          </button>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {grouped.map(({ category, items }) => (
          <div key={category}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {equipmentCategoryDisplayName(category)}
            </h3>
            <div className="flex flex-col gap-1 rounded-xl bg-slate-800">
              {items.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center justify-between border-b border-slate-700/60 px-4 py-3 last:border-b-0"
                >
                  <span className="text-slate-100">{item.name}</span>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="h-5 w-5 accent-sky-500"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
