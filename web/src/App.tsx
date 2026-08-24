import { useEffect, useState } from "react";
import { seedIfNeeded } from "./db/seed";
import { TabBar, type TabKey } from "./components/TabBar";
import { WorkoutScreen } from "./features/workout/WorkoutScreen";
import { GymsScreen } from "./features/gyms/GymsScreen";
import { LogScreen } from "./features/log/LogScreen";

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [tab, setTab] = useState<TabKey>("workout");

  useEffect(() => {
    void seedIfNeeded().then(() => setIsReady(true));
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
        {tab === "workout" && <WorkoutScreen />}
        {tab === "gyms" && <GymsScreen />}
        {tab === "log" && <LogScreen />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
