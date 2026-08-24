import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";
import { LogList } from "./LogList";
import { LogDetail } from "./LogDetail";

export function LogScreen() {
  const sessions =
    useLiveQuery(
      () => db.sessions.orderBy("date").reverse().filter((s) => s.isCompleted).toArray(),
      [],
    ) ?? [];
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  if (selectedSessionId) {
    return <LogDetail sessionId={selectedSessionId} onBack={() => setSelectedSessionId(null)} />;
  }

  return <LogList sessions={sessions} onSelect={setSelectedSessionId} />;
}
