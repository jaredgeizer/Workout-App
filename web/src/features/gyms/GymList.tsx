import { useState } from "react";
import type { Gym } from "../../types/gym";
import { createGym, deleteGym } from "../../db/repo";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";

interface Props {
  gyms: Gym[];
  onSelect: (id: string) => void;
}

export function GymList({ gyms, onSelect }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");

  async function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) {
      setIsAdding(false);
      return;
    }
    await createGym(trimmed);
    setNewName("");
    setIsAdding(false);
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Gyms</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-xl font-medium text-slate-950 active:bg-sky-400"
          aria-label="Add gym"
        >
          +
        </button>
      </div>

      {isAdding && (
        <div className="flex gap-2 rounded-xl bg-slate-800 p-3">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Gym name"
            className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          />
          <button onClick={handleAdd} className="rounded-lg bg-sky-500 px-4 py-2 font-medium text-slate-950">
            Add
          </button>
        </div>
      )}

      {gyms.length === 0 && !isAdding && (
        <p className="mt-8 text-center text-slate-400">No gyms yet. Add one to start tracking available equipment.</p>
      )}

      <ul className="flex flex-col gap-2">
        {gyms.map((gym) => (
          <GymRow key={gym.id} gymId={gym.id} name={gym.name} isDefault={gym.isDefault} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  );
}

function GymRow({ gymId, name, isDefault, onSelect }: { gymId: string; name: string; isDefault: boolean; onSelect: (id: string) => void }) {
  const equipmentCount = useLiveQuery(async () => (await db.gyms.get(gymId))?.equipmentIds.length ?? 0, [gymId]) ?? 0;

  return (
    <li className="flex items-center gap-2 rounded-xl bg-slate-800 pr-2">
      <button onClick={() => onSelect(gymId)} className="flex flex-1 items-center justify-between px-4 py-3 text-left active:bg-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-100">{name}</span>
            {isDefault && (
              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-medium text-sky-400">Default</span>
            )}
          </div>
          <p className="text-sm text-slate-400">{equipmentCount} equipment items</p>
        </div>
        <span className="ml-3 text-slate-500">›</span>
      </button>
      <button
        onClick={() => {
          if (confirm(`Delete "${name}"?`)) void deleteGym(gymId);
        }}
        aria-label={`Delete ${name}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-700 active:text-red-400"
      >
        ✕
      </button>
    </li>
  );
}
