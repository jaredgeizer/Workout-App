import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getProfile, setProfileAge } from "../../db/repo";
import { exportAllData, importAllData } from "../../db/backup";
import {
  AGE_RECOVERY_STEP_PER_DECADE,
  EFFORT_RECOVERY_STEP_PER_POINT,
  MAX_SESSION_FATIGUE,
  MUSCLE_RECOVERY_HOURS,
  PER_HIT_FATIGUE_AT_MAX_EFFORT,
  SECONDARY_MOVER_WEIGHT,
} from "../../domain/freshness";
import { ACUTE_WINDOW_DAYS, CHRONIC_WINDOW_DAYS, LOAD_LABEL_THRESHOLDS } from "../../domain/trainingLoad";

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
  const recoveryHourTiers = [...new Set(Object.values(MUSCLE_RECOVERY_HOURS))].sort((a, b) => b - a);

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

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-8">
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
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            How Muscle Freshness &amp; Training Load Work
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Rough heuristics, not a tuned model — expect these numbers to shift as we see how well
            they track against how you actually feel.
          </p>

          <div className="mt-3 rounded-lg bg-slate-800 p-3 text-xs leading-relaxed text-slate-400">
            <p className="font-semibold text-slate-300">Muscle Freshness (Body tab)</p>
            <p className="mt-1">
              Each muscle has a base recovery window ({recoveryHourTiers.join("/")}h depending on
              the muscle) that lengthens {Math.round(AGE_RECOVERY_STEP_PER_DECADE * 100)}% per
              decade of age past 30, and lengthens or shortens{" "}
              {Math.round(EFFORT_RECOVERY_STEP_PER_POINT * 100)}% per session-effort point away
              from 5 (moderate).
            </p>
            <p className="mt-1">
              Right when a session ends: fatigue = min({Math.round(MAX_SESSION_FATIGUE * 100)}%,
              hits × (effort ÷ 10) × {Math.round(PER_HIT_FATIGUE_AT_MAX_EFFORT * 100)}%) — "hits"
              adds 1 per exercise that session that used the muscle as a primary mover, and{" "}
              {Math.round(SECONDARY_MOVER_WEIGHT * 100)}% of that per exercise where it was only a
              secondary mover (e.g. triceps on a chest-primary Push Up). So freshness never drops
              below {Math.round((1 - MAX_SESSION_FATIGUE) * 100)}% immediately after, no matter how
              hard or how much volume the session was, then it climbs back to 100% over the
              recovery window above.
            </p>
          </div>

          <div className="mt-2 rounded-lg bg-slate-800 p-3 text-xs leading-relaxed text-slate-400">
            <p className="font-semibold text-slate-300">Training Load (Body tab)</p>
            <p className="mt-1">
              Each rated session contributes duration (minutes) × effort (1–10) to that day's
              load; unrated sessions contribute 0. "Acute" load is the sum of the last{" "}
              {ACUTE_WINDOW_DAYS} days; "chronic" load is a weekly average over your last{" "}
              {CHRONIC_WINDOW_DAYS} days of training (or your full history if shorter).
            </p>
            <p className="mt-1">
              The label compares acute to chronic as a percent difference: Well Below (≤
              {LOAD_LABEL_THRESHOLDS.wellBelow}%), Below (≤{LOAD_LABEL_THRESHOLDS.below}%), Steady
              (up to {LOAD_LABEL_THRESHOLDS.steady}%), Above (up to {LOAD_LABEL_THRESHOLDS.above}
              %), Well Above ({LOAD_LABEL_THRESHOLDS.above}%+).
            </p>
          </div>
        </div>

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
