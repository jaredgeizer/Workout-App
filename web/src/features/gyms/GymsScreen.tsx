import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/schema";
import { GymList } from "./GymList";
import { GymDetail } from "./GymDetail";

export function GymsScreen() {
  const gyms = useLiveQuery(() => db.gyms.orderBy("createdAt").toArray(), []) ?? [];
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);

  const selectedGym = gyms.find((g) => g.id === selectedGymId);

  if (selectedGym) {
    return <GymDetail gym={selectedGym} onBack={() => setSelectedGymId(null)} />;
  }

  return <GymList gyms={gyms} onSelect={setSelectedGymId} />;
}
