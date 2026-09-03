import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";
import type { Exercise } from "../../types/exercise";
import { muscleDisplayName } from "../../types/muscleGroup";
import { ExerciseThumbnail } from "../workout/ExerciseThumbnail";
import { ExerciseDetailModal } from "../workout/ExerciseDetailModal";
import { ExerciseForm } from "./ExerciseForm";

export function ExerciseLibrarySection() {
  const allExercises = useLiveQuery(() => db.exercises.orderBy("name").toArray(), []) ?? [];
  const [search, setSearch] = useState("");
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allExercises;
    return allExercises.filter((exercise) => exercise.name.toLowerCase().includes(q));
  }, [allExercises, search]);

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Exercises</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-xl font-medium text-slate-950 active:bg-sky-400"
          aria-label="Add exercise"
        >
          +
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search exercises"
        className="rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
      />

      <ul className="flex flex-col">
        {filtered.map((exercise) => (
          <li key={exercise.id}>
            <button
              onClick={() => setDetailExercise(exercise)}
              className="flex w-full items-center gap-3 border-b border-slate-800 py-3 text-left active:bg-slate-800/60"
            >
              <ExerciseThumbnail exercise={exercise} />
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-slate-100">{exercise.name}</span>
                  {exercise.isCustom && (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      Custom
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{exercise.primaryMuscles.map(muscleDisplayName).join(", ")}</span>
              </div>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <p className="mt-8 text-center text-slate-500">No exercises match.</p>}
      </ul>

      {detailExercise && (
        <ExerciseDetailModal
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
          onEdit={() => {
            setEditingExercise(detailExercise);
            setDetailExercise(null);
          }}
        />
      )}
      {isCreating && <ExerciseForm onDone={() => setIsCreating(false)} />}
      {editingExercise && <ExerciseForm initialExercise={editingExercise} onDone={() => setEditingExercise(null)} />}
    </div>
  );
}
