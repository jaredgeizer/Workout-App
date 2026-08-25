import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getProfile, setProfileAge } from "../../db/repo";
import {
  AGE_RECOVERY_STEP_PER_DECADE,
  EFFORT_RECOVERY_STEP_PER_POINT,
  MAX_SESSION_FATIGUE,
  MUSCLE_RECOVERY_HOURS,
  PER_HIT_FATIGUE_AT_MAX_EFFORT,
} from "../../domain/freshness";
import { ACUTE_WINDOW_DAYS, CHRONIC_WINDOW_DAYS, LOAD_LABEL_THRESHOLDS } from "../../domain/trainingLoad";

interface Props {
  onClose: () => void;
}

export function ProfileEditor({ onClose }: Props) {
  const profile = useLiveQuery(() => getProfile(), []);
  const [age, setAge] = useState<string>("");
  const [hasEdited, setHasEdited] = useState(false);

  const displayAge = hasEdited ? age : (profile?.age?.toString() ?? "");
  const recoveryHourTiers = [...new Set(Object.values(MUSCLE_RECOVERY_HOURS))].sort((a, b) => b - a);

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
              is how many exercises in that session used the muscle as a primary mover. So
              freshness never drops below {Math.round((1 - MAX_SESSION_FATIGUE) * 100)}%
              immediately after, no matter how hard or how much volume the session was, then it
              climbs back to 100% over the recovery window above.
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
      </div>
    </div>
  );
}
