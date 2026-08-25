import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getProfile, setProfileAge } from "../../db/repo";

interface Props {
  onClose: () => void;
}

export function ProfileEditor({ onClose }: Props) {
  const profile = useLiveQuery(() => getProfile(), []);
  const [age, setAge] = useState<string>("");
  const [hasEdited, setHasEdited] = useState(false);

  const displayAge = hasEdited ? age : (profile?.age?.toString() ?? "");

  async function handleSave() {
    const parsed = Number(age || displayAge);
    if (parsed > 0) {
      await setProfileAge(parsed);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Profile</h2>
        <button onClick={onClose} className="text-sm font-medium text-sky-400 active:text-sky-300">
          Cancel
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Age</label>
          <input
            type="number"
            inputMode="numeric"
            value={displayAge}
            onChange={(e) => {
              setHasEdited(true);
              setAge(e.target.value);
            }}
            placeholder="Not set"
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Used to adjust how long muscle recovery takes on the Body tab — recovery windows get a
            bit longer past 30. Nothing else uses this.
          </p>
        </div>

        <button onClick={() => void handleSave()} className="w-full rounded-xl bg-sky-500 py-3 font-semibold text-slate-950 active:bg-sky-400">
          Save
        </button>
      </div>
    </div>
  );
}
