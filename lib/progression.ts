import type { Exercise } from "./plan";
import type { Session, SetEntry } from "./storage";
import type { Unit } from "./units";

export type Reason = "first" | "top-bodyweight" | "add-weight" | "add-reps";

export type Target = { sets: SetEntry[]; reason: Reason; weightIncrease: number };

export function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

/** "62.5", "60", never "62.50". */
export function formatWeight(n: number): string {
  return String(Math.round(n * 100) / 100);
}

/** "60 kg · 8 8 7 6", or "60×8 57.5×7" when weights differ. */
export function formatSets(sets: SetEntry[], bodyweight: boolean, unit: Unit = "kg"): string {
  if (sets.length === 0) return "";
  const reps = sets.map((s) => s.reps).join(" ");
  const sameWeight = sets.every((s) => s.weight === sets[0].weight);
  if (sameWeight && sets[0].weight === 0 && bodyweight) return `${reps} reps`;
  if (sameWeight) return `${formatWeight(sets[0].weight)} ${unit} · ${reps}`;
  return `${sets.map((s) => `${formatWeight(s.weight)}×${s.reps}`).join("  ")} ${unit}`;
}

/** One set: "60 kg × 8", or "15 reps" for bodyweight. */
export function formatSet(set: SetEntry, bodyweight: boolean, unit: Unit = "kg"): string {
  if (bodyweight && set.weight === 0) return `${set.reps} reps`;
  return `${formatWeight(set.weight)} ${unit} × ${set.reps}`;
}

/** Most recent session strictly before `today` with at least one set. */
export function lastSession(sessions: Session[], today: string): Session | undefined {
  let best: Session | undefined;
  for (const s of sessions) {
    if (s.date >= today || s.sets.length === 0) continue;
    if (!best || s.date > best.date) best = s;
  }
  return best;
}

export function heaviest(sets: SetEntry[]): number {
  return sets.reduce((m, s) => Math.max(m, s.weight), 0);
}

/** Weights in `last` and in the result are in the same unit as `jump` (kg by default). */
export function target(exercise: Exercise, last: Session | undefined, jump: number = exercise.jump): Target {
  const n = exercise.sets;

  if (!last || last.sets.length === 0) {
    return { sets: fill(n, () => ({ weight: 0, reps: exercise.repMin })), reason: "first", weightIncrease: 0 };
  }

  const at = (i: number) => last.sets[Math.min(i, last.sets.length - 1)];
  const hitTop =
    last.sets.length >= last.plannedSets && last.sets.every((s) => s.reps >= exercise.repMax);

  if (hitTop) {
    if (exercise.kind === "bodyweight") {
      return {
        sets: fill(n, (i) => ({ weight: roundHalf(at(i).weight), reps: exercise.repMax })),
        reason: "top-bodyweight",
        weightIncrease: 0,
      };
    }
    const weight = roundHalf(heaviest(last.sets) + jump);
    return {
      sets: fill(n, () => ({ weight, reps: exercise.repMin })),
      reason: "add-weight",
      weightIncrease: roundHalf(weight - heaviest(last.sets)),
    };
  }

  return {
    sets: fill(n, (i) => ({
      weight: roundHalf(at(i).weight),
      reps: Math.min(exercise.repMax, at(i).reps + 1),
    })),
    reason: "add-reps",
    weightIncrease: 0,
  };
}

export type Compare = "better" | "same" | "worse";

/** Compare a done set with last time's same set. */
export function compareSet(now: SetEntry, before: SetEntry | undefined): Compare | undefined {
  if (!before) return undefined;
  if (now.weight > before.weight) return "better";
  if (now.weight < before.weight) return "worse";
  if (now.reps > before.reps) return "better";
  if (now.reps < before.reps) return "worse";
  return "same";
}

function fill(n: number, f: (i: number) => SetEntry): SetEntry[] {
  return Array.from({ length: n }, (_, i) => f(i));
}
