import { db } from "../db/schema";
import type { WorkoutSession } from "../types/workoutSession";

const TRAILING_DAYS = 35;
const CHRONIC_WINDOW_DAYS = 28;
const ACUTE_WINDOW_DAYS = 7;

/** Session-RPE training load: duration (minutes) x effort. 0 for unrated/skipped sessions. */
export function sessionLoad(session: WorkoutSession): number {
  if (session.effort === undefined) return 0;
  return (session.duration / 60) * session.effort;
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface DayLoad {
  date: string; // local YYYY-MM-DD
  load: number;
}

export type LoadLabel = "Well Below" | "Below" | "Steady" | "Above" | "Well Above";

export interface TrainingLoadSummary {
  days: DayLoad[]; // trailing TRAILING_DAYS days, oldest first
  acuteLoad: number; // sum of the last 7 days
  chronicWeeklyAvg: number | null; // null until at least one session has been rated
  percentDiff: number | null;
  label: LoadLabel | null;
  lastRatedAt: string | null;
}

/**
 * Compares a rolling 7-day training-load sum ("acute") against a rolling, history-length-
 * normalized weekly average ("chronic") — the same acute:chronic idea Apple Fitness uses for
 * "training load" — expressed as a percentage difference with a rough qualitative band.
 * Not a tuned model; thresholds approximate Apple's public bands.
 */
export async function computeTrainingLoad(): Promise<TrainingLoadSummary> {
  const sessions = await db.sessions.toArray();
  const completed = sessions.filter((s) => s.isCompleted);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const loadByDay = new Map<string, number>();
  let earliestSessionDate: Date | null = null;
  let lastRatedAt: string | null = null;

  for (const session of completed) {
    const sessionDate = new Date(session.date);
    if (!earliestSessionDate || sessionDate < earliestSessionDate) earliestSessionDate = sessionDate;
    if (session.effort !== undefined && (!lastRatedAt || session.date > lastRatedAt)) lastRatedAt = session.date;

    const key = dayKey(sessionDate);
    loadByDay.set(key, (loadByDay.get(key) ?? 0) + sessionLoad(session));
  }

  const days: DayLoad[] = [];
  for (let i = TRAILING_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ date: dayKey(d), load: loadByDay.get(dayKey(d)) ?? 0 });
  }

  const acuteLoad = days.slice(-ACUTE_WINDOW_DAYS).reduce((sum, d) => sum + d.load, 0);

  if (!earliestSessionDate) {
    return { days, acuteLoad: 0, chronicWeeklyAvg: null, percentDiff: null, label: null, lastRatedAt: null };
  }

  const daysSinceFirstSession =
    Math.floor((today.getTime() - earliestSessionDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const chronicWindowDays = Math.min(Math.max(1, daysSinceFirstSession), CHRONIC_WINDOW_DAYS);
  const weeksOfHistory = Math.max(1, chronicWindowDays / 7);
  const chronicLoadSum = days.slice(-chronicWindowDays).reduce((sum, d) => sum + d.load, 0);
  const chronicWeeklyAvg = chronicLoadSum / weeksOfHistory;

  if (chronicWeeklyAvg === 0) {
    return { days, acuteLoad, chronicWeeklyAvg: 0, percentDiff: null, label: null, lastRatedAt };
  }

  const percentDiff = ((acuteLoad - chronicWeeklyAvg) / chronicWeeklyAvg) * 100;

  return {
    days,
    acuteLoad,
    chronicWeeklyAvg,
    percentDiff,
    label: labelForPercentDiff(percentDiff),
    lastRatedAt,
  };
}

function labelForPercentDiff(percentDiff: number): LoadLabel {
  if (percentDiff <= -30) return "Well Below";
  if (percentDiff <= -10) return "Below";
  if (percentDiff < 10) return "Steady";
  if (percentDiff < 50) return "Above";
  return "Well Above";
}
