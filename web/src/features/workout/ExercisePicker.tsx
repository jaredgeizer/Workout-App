import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";
import type { Exercise } from "../../types/exercise";
import { isExerciseAvailable } from "../../types/exercise";
import { MUSCLE_GROUPS, muscleDisplayName, type MuscleGroup } from "../../types/muscleGroup";

interface Props {
  availableEquipmentIds: Set<string> | undefined;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({ availableEquipmentIds, onSelect, onClose }: Props) {
  const allExercises = useLiveQuery(() => db.exercises.orderBy("name").toArray(), []) ?? [];
  const [search, setSearch] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "">("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);

  const filtered = useMemo(() => {
    return allExercises.filter((exercise) => {
      if (search && !exercise.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (muscle && !exercise.primaryMuscles.includes(muscle)) return false;
      if (onlyAvailable && availableEquipmentIds && !isExerciseAvailable(exercise, availableEquipmentIds)) return false;
      return true;
    });
  }, [allExercises, search, muscle, onlyAvailable, availableEquipmentIds]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Add Exercise</h2>
        <button onClick={onClose} className="text-sm font-medium text-sky-400 active:text-sky-300">
          Cancel
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises"
          className="rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
        />

        <select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value as MuscleGroup | "")}
          className="rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700"
        >
          <option value="">All Muscles</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {muscleDisplayName(m)}
            </option>
          ))}
        </select>

        {availableEquipmentIds && (
          <label className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2">
            <span className="text-sm text-slate-200">Only equipment at this gym</span>
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="h-5 w-5 accent-sky-500"
            />
          </label>
        )}
      </div>

      <ul className="flex-1 overflow-y-auto px-4 pb-8">
        {filtered.map((exercise) => (
          <li key={exercise.id}>
            <button
              onClick={() => onSelect(exercise)}
              className="flex w-full flex-col items-start gap-0.5 border-b border-slate-800 py-3 text-left active:bg-slate-800/60"
            >
              <span className="text-slate-100">{exercise.name}</span>
              <span className="text-xs text-slate-500">{exercise.primaryMuscles.map(muscleDisplayName).join(", ")}</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <p className="mt-8 text-center text-slate-500">No exercises match.</p>}
      </ul>
    </div>
  );
}
