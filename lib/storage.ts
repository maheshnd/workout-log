// The ONLY module that touches localStorage. A Supabase version can replace the
// store functions later with the same signatures.
import type { Exercise } from "./plan";
import { isSession } from "./exportImport";

export type SetEntry = { weight: number; reps: number }; // weight in kg, 0 allowed

export type Session = {
  date: string; // local date "YYYY-MM-DD"
  exerciseId: string;
  plannedSets: number; // snapshot of plan at the time
  repMin: number;
  repMax: number;
  sets: SetEntry[]; // only sets ticked as done, in order
};

export type Store = { version: 1; sessions: Session[] };

const KEY = "gymlog:v1";
const UI_KEY = "gymlog:ui";
const EXPORT_KEY = "gymlog:lastExport";
const HINT_KEY = "gymlog:installHintDismissed";

let cache: Store | null = null;

function empty(): Store {
  return { version: 1, sessions: [] };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns false if the write failed (quota, private mode). */
function write(key: string, value: string | null): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function persist(store: Store): boolean {
  cache = store;
  return write(KEY, JSON.stringify(store));
}

// ---------- Store API ----------

export function loadStore(): Store {
  if (cache) return cache;
  try {
    const raw = read(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as Store).sessions)) {
      cache = { version: 1, sessions: (parsed as Store).sessions.filter(isSession) };
    } else {
      cache = empty();
    }
  } catch {
    cache = empty();
  }
  return cache;
}

export function getSessions(exerciseId: string): Session[] {
  return loadStore().sessions.filter((s) => s.exerciseId === exerciseId);
}

/** Save set `index` of the (date, exercise) session. Index past the end appends. */
export function upsertSet(date: string, exercise: Exercise, index: number, set: SetEntry): boolean {
  const store = loadStore();
  const existing = store.sessions.find((s) => s.date === date && s.exerciseId === exercise.id);
  const base: Session = existing ?? {
    date,
    exerciseId: exercise.id,
    plannedSets: exercise.sets,
    repMin: exercise.repMin,
    repMax: exercise.repMax,
    sets: [],
  };
  const sets = [...base.sets];
  if (index < sets.length) sets[index] = set;
  else sets.push(set);
  const next: Session = {
    ...base,
    plannedSets: exercise.sets,
    repMin: exercise.repMin,
    repMax: exercise.repMax,
    sets,
  };
  const sessions = existing
    ? store.sessions.map((s) => (s === existing ? next : s))
    : [...store.sessions, next];
  return persist({ version: 1, sessions });
}

export function removeSet(date: string, exerciseId: string, index: number): boolean {
  const store = loadStore();
  const sessions = store.sessions
    .map((s) =>
      s.date === date && s.exerciseId === exerciseId
        ? { ...s, sets: s.sets.filter((_, i) => i !== index) }
        : s,
    )
    .filter((s) => s.sets.length > 0);
  return persist({ version: 1, sessions });
}

export function replaceStore(store: Store): boolean {
  return persist({ version: 1, sessions: store.sessions });
}

export function clearAll(): boolean {
  cache = empty();
  return write(KEY, null);
}

// ---------- Small app settings (kept here so nothing else touches localStorage) ----------

export function getLastExport(): string | null {
  return read(EXPORT_KEY);
}

export function setLastExport(iso: string): void {
  write(EXPORT_KEY, iso);
}

export function loadUi<T>(): T | null {
  try {
    const raw = read(UI_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveUi(ui: unknown): void {
  write(UI_KEY, JSON.stringify(ui));
}

export function isInstallHintDismissed(): boolean {
  return read(HINT_KEY) === "1";
}

export function dismissInstallHint(): void {
  write(HINT_KEY, "1");
}
