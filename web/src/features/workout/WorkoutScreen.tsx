import { useState } from "react";
import { BuildWorkout } from "./BuildWorkout";
import { GenerateWorkoutForm } from "./GenerateWorkoutForm";
import { ActivityLogModal } from "./ActivityLogModal";
import { FullScreenOverlay } from "../../components/FullScreenOverlay";
import type { PlannedExercise } from "../../db/repo";

type Stage =
  | { kind: "home" }
  | { kind: "generating" }
  | { kind: "building"; initialPlan?: PlannedExercise[]; initialGymId?: string }
  | { kind: "loggingActivity" };

interface Props {
  onWorkoutStarted: (sessionId: string) => void;
}

export function WorkoutScreen({ onWorkoutStarted }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: "home" });

  if (stage.kind === "generating") {
    return (
      <GenerateWorkoutForm
        onCancel={() => setStage({ kind: "home" })}
        onGenerated={(plan, gymId) => setStage({ kind: "building", initialPlan: plan, initialGymId: gymId })}
      />
    );
  }

  if (stage.kind === "loggingActivity") {
    return <ActivityLogModal onDone={() => setStage({ kind: "home" })} />;
  }

  if (stage.kind === "building") {
    return (
      <FullScreenOverlay>
        <BuildWorkout
          initialPlan={stage.initialPlan}
          initialGymId={stage.initialGymId}
          onCancel={() => setStage({ kind: "home" })}
          onStarted={(sessionId) => {
            setStage({ kind: "home" });
            onWorkoutStarted(sessionId);
          }}
        />
      </FullScreenOverlay>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-500/15 text-4xl">🏋️</div>
      <h1 className="text-2xl font-semibold text-slate-100">Ready for your next workout?</h1>
      <button
        onClick={() => setStage({ kind: "building" })}
        className="w-full max-w-xs rounded-2xl bg-sky-500 px-6 py-4 text-lg font-semibold text-slate-950 active:bg-sky-400"
      >
        Start New Workout
      </button>
      <button
        onClick={() => setStage({ kind: "generating" })}
        className="w-full max-w-xs rounded-2xl border border-slate-700 px-6 py-4 text-lg font-semibold text-slate-200 active:bg-slate-800"
      >
        Generate Workout
      </button>
      <button
        onClick={() => setStage({ kind: "loggingActivity" })}
        className="mt-2 text-sm font-medium text-slate-400 active:text-slate-200"
      >
        + Log Activity
      </button>
    </div>
  );
}
