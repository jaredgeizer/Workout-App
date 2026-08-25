import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getProfile, setProfileAge } from "../../db/repo";
import { exportAllData, importAllData } from "../../db/backup";

interface Props {
  onClose: () => void;
}

export function ProfileEditor({ onClose }: Props) {
  const profile = useLiveQuery(() => getProfile(), []);
  const [age, setAge] = useState<string>("");
  const [hasEdited, setHasEdited] = useState(false);
  const [dataMessage, setDataMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const displayAge = hasEdited ? age : (profile?.age?.toString() ?? "");

  async function handleSave() {
    const parsed = Number(age || displayAge);
    if (parsed > 0) {
      await setProfileAge(parsed);
    }
    onClose();
  }

  /** Prefers the Web Share sheet (the reliable way to get a file out of an installed iOS
   * PWA into Files/iCloud/AirDrop — direct downloads are flaky in standalone WKWebView),
   * falling back to a plain download link where Web Share isn't available. */
  async function handleExport() {
    const json = await exportAllData();
    const filename = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], filename, { type: "application/json" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Workout backup" });
        return;
      } catch {
        // User cancelled the share sheet, or the browser rejected it — fall through to download.
      }
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!confirm("This replaces ALL current data with the backup file. Continue?")) return;

    try {
      await importAllData(await file.text());
      // Every table just changed at once — reload rather than trying to reconcile every
      // live query across the app individually.
      window.location.reload();
    } catch (err) {
      setDataMessage(err instanceof Error ? err.message : "Import failed.");
    }
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

        <div className="border-t border-slate-800 pt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Data</label>
          <p className="mb-3 text-xs text-slate-500">
            Everything is stored only on this device — there's no account or server copy. Export a
            backup now and then to protect against clearing your browser's site data or losing the
            phone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => void handleExport()}
              className="flex-1 rounded-lg bg-slate-800 py-2.5 font-medium text-slate-200 active:bg-slate-700"
            >
              Export Backup
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex-1 rounded-lg bg-slate-800 py-2.5 font-medium text-slate-200 active:bg-slate-700"
            >
              Import Backup
            </button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            onChange={(e) => void handleImportFile(e)}
            className="hidden"
          />
          {dataMessage && <p className="mt-2 text-xs text-red-400">{dataMessage}</p>}
        </div>
      </div>
    </div>
  );
}
