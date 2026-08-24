import { useEffect, useState } from "react";
import { seedIfNeeded } from "./db/seed";
import { findActiveSession } from "./db/repo";
import { TabBar, type TabKey } from "./components/TabBar";
import { FullScreenOverlay } from "./components/FullScreenOverlay";
import { WorkoutScreen } from "./features/workout/WorkoutScreen";
import { ActiveWorkout } from "./features/workout/ActiveWorkout";
import { RoutinesScreen } from "./features/routines/RoutinesScreen";
import { GymsScreen } from "./features/gyms/GymsScreen";
import { LogScreen } from "./features/log/LogScreen";

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [tab, setTab] = useState<TabKey>("workout");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    void seedIfNeeded()
      .then(() => findActiveSession())
      .then((session) => {
        if (session) setActiveSessionId(session.id);
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col bg-slate-900">
      <main className="flex flex-1 flex-col">
        {tab === "workout" && <WorkoutScreen onWorkoutStarted={setActiveSessionId} />}
        {tab === "routines" && <RoutinesScreen onWorkoutStarted={setActiveSessionId} />}
        {tab === "gyms" && <GymsScreen />}
        {tab === "log" && <LogScreen />}
      </main>
      <TabBar active={tab} onChange={setTab} />

      {activeSessionId && (
        <FullScreenOverlay>
          <ActiveWorkout sessionId={activeSessionId} onDone={() => setActiveSessionId(null)} />
        </FullScreenOverlay>
      )}
    </div>
  );
}
