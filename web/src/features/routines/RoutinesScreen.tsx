import { useState } from "react";
import { RoutineSection } from "./RoutineSection";
import { GymsScreen } from "../gyms/GymsScreen";
import { ExerciseLibrarySection } from "../exercises/ExerciseLibrarySection";

type Segment = "routines" | "gyms" | "exercises";

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "routines", label: "Routines" },
  { key: "gyms", label: "Gyms" },
  { key: "exercises", label: "Exercises" },
];

interface Props {
  onWorkoutStarted: (sessionId: string) => void;
}

export function RoutinesScreen({ onWorkoutStarted }: Props) {
  const [segment, setSegment] = useState<Segment>("routines");

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex gap-1 p-4 pb-0">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              segment === s.key ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-300 active:bg-slate-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {segment === "routines" && <RoutineSection onWorkoutStarted={onWorkoutStarted} />}
      {segment === "gyms" && <GymsScreen />}
      {segment === "exercises" && <ExerciseLibrarySection />}
    </div>
  );
}
