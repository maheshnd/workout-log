import type { Exercise } from "./plan";
import type { Session, SetEntry } from "./storage";

// Weights are always stored in kg. In lb mode they are converted for display and input only.
export type Unit = "kg" | "lb";

const LB_PER_KG = 2.20462262185;

/** kg → display unit (2 decimals). */
export function toUnit(kg: number, unit: Unit): number {
  return unit === "lb" ? Math.round(kg * LB_PER_KG * 100) / 100 : kg;
}

/** Display unit → kg. Kept at 4 decimals so a typed lb value converts back exactly. */
export function fromUnit(value: number, unit: Unit): number {
  return unit === "lb" ? Math.round((value / LB_PER_KG) * 10000) / 10000 : value;
}

export function setToUnit(set: SetEntry, unit: Unit): SetEntry {
  return { weight: toUnit(set.weight, unit), reps: set.reps };
}

export function sessionsToUnit(sessions: Session[], unit: Unit): Session[] {
  if (unit === "kg") return sessions;
  return sessions.map((s) => ({ ...s, sets: s.sets.map((x) => setToUnit(x, unit)) }));
}

/** Progression jump in the display unit. */
export function jumpFor(ex: Exercise, unit: Unit): number {
  return unit === "lb" ? ex.jumpLb : ex.jump;
}

/** Weight stepper step: the jump, or a small step for isolation work. */
export function stepFor(ex: Exercise, unit: Unit): number {
  if (ex.kind === "iso") return unit === "lb" ? 2.5 : 1;
  return jumpFor(ex, unit);
}

export function noteFor(ex: Exercise, unit: Unit): string | undefined {
  return ex.note?.replace("{unit}", unit);
}
