import { isValidDate, todayLocal } from "./dates";
import type { Session, SetEntry } from "./storage";

export type ExportFile = {
  app: "gym-log";
  version: 1;
  exportedAt: string;
  sessions: Session[];
};

export const BAD_FILE = "This file isn't a Gym Log backup.";

const nonNeg = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;

function isSet(v: unknown): v is SetEntry {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return nonNeg(s.weight) && nonNeg(s.reps);
}

export function isSession(v: unknown): v is Session {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.date === "string" &&
    isValidDate(s.date) &&
    typeof s.exerciseId === "string" &&
    s.exerciseId.length > 0 &&
    nonNeg(s.plannedSets) &&
    nonNeg(s.repMin) &&
    nonNeg(s.repMax) &&
    Array.isArray(s.sets) &&
    s.sets.every(isSet)
  );
}

export function buildExport(sessions: Session[], now: Date): ExportFile {
  return { app: "gym-log", version: 1, exportedAt: now.toISOString(), sessions };
}

/** Validate a backup file. All-or-nothing: any bad session rejects the whole file. */
export function parseImport(text: string): { ok: true; sessions: Session[] } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: BAD_FILE };
  }
  if (!data || typeof data !== "object") return { ok: false, error: BAD_FILE };
  const f = data as Record<string, unknown>;
  if (f.app !== "gym-log" || f.version !== 1 || !Array.isArray(f.sessions) || !f.sessions.every(isSession)) {
    return { ok: false, error: BAD_FILE };
  }
  // Keep only the known fields.
  const sessions = (f.sessions as Session[]).map((s) => ({
    date: s.date,
    exerciseId: s.exerciseId,
    plannedSets: s.plannedSets,
    repMin: s.repMin,
    repMax: s.repMax,
    sets: s.sets.map((x) => ({ weight: x.weight, reps: x.reps })),
  }));
  return { ok: true, sessions };
}

/** On matching (date, exerciseId) the file wins; everything else is kept. */
export function mergeSessions(existing: Session[], incoming: Session[]): Session[] {
  const key = (s: Session) => `${s.date}|${s.exerciseId}`;
  const map = new Map<string, Session>();
  for (const s of existing) map.set(key(s), s);
  for (const s of incoming) map.set(key(s), s);
  return [...map.values()];
}

/**
 * Save the backup file. iOS (esp. installed to home screen) can't reliably use <a download>,
 * so use the share sheet there when it accepts files. Returns false if the user cancelled.
 */
export async function exportBackup(sessions: Session[], now: Date, isIOS: boolean): Promise<boolean> {
  const name = `gym-log-${todayLocal(now)}.json`;
  const json = JSON.stringify(buildExport(sessions, now), null, 2);
  const file = new File([json], name, { type: "application/json" });

  if (isIOS && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return false;
      // Otherwise fall through to a normal download.
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
