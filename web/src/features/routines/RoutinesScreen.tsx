import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";
import { loadPlannedExercisesFromRoutine, type PlannedExercise } from "../../db/repo";
import { RoutineList } from "./RoutineList";
import { RoutineDetail } from "./RoutineDetail";
import { BuildWorkout } from "../workout/BuildWorkout";
import { FullScreenOverlay } from "../../components/FullScreenOverlay";

type Stage =
  | { kind: "list" }
  | { kind: "detail"; routineId: string }
  | { kind: "building"; routineId: string; initialPlan: PlannedExercise[] };

interface Props {
  onWorkoutStarted: (sessionId: string) => void;
}

export function RoutinesScreen({ onWorkoutStarted }: Props) {
  const routines = useLiveQuery(() => db.routines.orderBy("createdAt").toArray(), []) ?? [];
  const [stage, setStage] = useState<Stage>({ kind: "list" });

  async function handleStart(routineId: string) {
    const initialPlan = await loadPlannedExercisesFromRoutine(routineId);
    setStage({ kind: "building", routineId, initialPlan });
  }

  if (stage.kind === "building") {
    return (
      <FullScreenOverlay>
        <BuildWorkout
          initialPlan={stage.initialPlan}
          routineId={stage.routineId}
          onCancel={() => setStage({ kind: "detail", routineId: stage.routineId })}
          onStarted={(sessionId) => {
            setStage({ kind: "list" });
            onWorkoutStarted(sessionId);
          }}
        />
      </FullScreenOverlay>
    );
  }

  if (stage.kind === "detail") {
    return (
      <RoutineDetail
        routineId={stage.routineId}
        onBack={() => setStage({ kind: "list" })}
        onStart={handleStart}
      />
    );
  }

  return <RoutineList routines={routines} onSelect={(routineId) => setStage({ kind: "detail", routineId })} />;
}
