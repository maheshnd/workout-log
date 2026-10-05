import { describe, expect, it } from "vitest";
import { findExercise } from "./plan";
import { compareSet, formatKg, lastSession, target } from "./progression";
import type { Session } from "./storage";

function ex(day: number, id: string) {
  const e = findExercise(day, id);
  if (!e) throw new Error(`missing ${id}`);
  return e;
}

function session(
  date: string,
  exerciseId: string,
  plannedSets: number,
  repMin: number,
  repMax: number,
  weights: number | number[],
  reps: number[],
): Session {
  return {
    date,
    exerciseId,
    plannedSets,
    repMin,
    repMax,
    sets: reps.map((r, i) => ({ weight: Array.isArray(weights) ? weights[i] : weights, reps: r })),
  };
}

const bench = ex(1, "bench-press");

describe("target", () => {
  it("no history: first, weight 0, reps = repMin", () => {
    const t = target(bench, undefined);
    expect(t.reason).toBe("first");
    expect(t.sets).toEqual([
      { weight: 0, reps: 6 },
      { weight: 0, reps: 6 },
      { weight: 0, reps: 6 },
      { weight: 0, reps: 6 },
    ]);
  });

  it("bench 60 × [8,8,7,6] → [8,8,8,7] at 60", () => {
    const t = target(bench, session("2026-10-01", "bench-press", 4, 6, 8, 60, [8, 8, 7, 6]));
    expect(t.reason).toBe("add-reps");
    expect(t.sets.map((s) => s.reps)).toEqual([8, 8, 8, 7]);
    expect(t.sets.every((s) => s.weight === 60)).toBe(true);
  });

  it("bench 60 × [8,8,8,8] → 62.5 × [6,6,6,6]", () => {
    const t = target(bench, session("2026-10-01", "bench-press", 4, 6, 8, 60, [8, 8, 8, 8]));
    expect(t.reason).toBe("add-weight");
    expect(t.weightIncrease).toBe(2.5);
    expect(t.sets).toEqual(Array(4).fill({ weight: 62.5, reps: 6 }));
    expect(formatKg(t.sets[0].weight)).toBe("62.5");
  });

  it("squat 100 × [8,8,8,8] → 105 × 6", () => {
    const squat = ex(3, "back-squat");
    const t = target(squat, session("2026-10-01", "back-squat", 4, 6, 8, 100, [8, 8, 8, 8]));
    expect(t.reason).toBe("add-weight");
    expect(t.sets).toEqual(Array(4).fill({ weight: 105, reps: 6 }));
  });

  it("lateral raise 10 × [15,15,15,15] → 12 × 12", () => {
    const lat = ex(1, "lateral-raise");
    const t = target(lat, session("2026-10-01", "lateral-raise", 4, 12, 15, 10, [15, 15, 15, 15]));
    expect(t.reason).toBe("add-weight");
    expect(t.sets).toEqual(Array(4).fill({ weight: 12, reps: 12 }));
  });

  it("only 2 of 4 sets done, both at top: NOT a weight increase", () => {
    const t = target(bench, session("2026-10-01", "bench-press", 4, 6, 8, 60, [8, 8]));
    expect(t.reason).toBe("add-reps");
    expect(t.sets).toEqual(Array(4).fill({ weight: 60, reps: 8 }));
  });

  it("RDL Wed (3 sets) then Sat (4 sets): Sat uses Wed's session, set 4 reuses set 3", () => {
    const rdlSat = ex(6, "romanian-deadlift");
    expect(rdlSat.sets).toBe(4);
    const wed = session("2026-09-30", "romanian-deadlift", 3, 8, 10, [100, 100, 95], [10, 9, 8]);
    const last = lastSession([wed], "2026-10-03");
    expect(last).toBe(wed);
    const t = target(rdlSat, last);
    expect(t.reason).toBe("add-reps");
    expect(t.sets).toEqual([
      { weight: 100, reps: 10 },
      { weight: 100, reps: 10 },
      { weight: 95, reps: 9 },
      { weight: 95, reps: 9 },
    ]);
  });

  it("hanging leg raise at top stays at 15 reps, weight 0", () => {
    const hlr = ex(3, "hanging-leg-raise");
    const t = target(hlr, session("2026-10-01", "hanging-leg-raise", 3, 12, 15, 0, [15, 15, 15]));
    expect(t.reason).toBe("top-bodyweight");
    expect(t.sets).toEqual(Array(3).fill({ weight: 0, reps: 15 }));
  });

  it("mixed weights [60,60,57.5]: per-set weights are kept", () => {
    const t = target(bench, session("2026-10-01", "bench-press", 4, 6, 8, [60, 60, 57.5], [7, 6, 6]));
    expect(t.reason).toBe("add-reps");
    expect(t.sets).toEqual([
      { weight: 60, reps: 8 },
      { weight: 60, reps: 7 },
      { weight: 57.5, reps: 7 },
      { weight: 57.5, reps: 7 },
    ]);
  });
});

describe("lastSession", () => {
  it("ignores a session dated today", () => {
    const old = session("2026-10-01", "bench-press", 4, 6, 8, 60, [8, 8, 7, 6]);
    const today = session("2026-10-04", "bench-press", 4, 6, 8, 60, [8]);
    expect(lastSession([old, today], "2026-10-04")).toBe(old);
    expect(lastSession([today], "2026-10-04")).toBeUndefined();
  });

  it("ignores empty sessions and picks the most recent", () => {
    const a = session("2026-09-20", "bench-press", 4, 6, 8, 55, [8]);
    const b = session("2026-09-27", "bench-press", 4, 6, 8, 57.5, [8]);
    const empty = session("2026-10-01", "bench-press", 4, 6, 8, 60, []);
    expect(lastSession([b, empty, a], "2026-10-04")).toBe(b);
  });
});

describe("compareSet", () => {
  it("more weight or same weight + more reps is better", () => {
    expect(compareSet({ weight: 62.5, reps: 5 }, { weight: 60, reps: 8 })).toBe("better");
    expect(compareSet({ weight: 60, reps: 9 }, { weight: 60, reps: 8 })).toBe("better");
    expect(compareSet({ weight: 60, reps: 8 }, { weight: 60, reps: 8 })).toBe("same");
    expect(compareSet({ weight: 60, reps: 7 }, { weight: 60, reps: 8 })).toBe("worse");
    expect(compareSet({ weight: 60, reps: 7 }, undefined)).toBeUndefined();
  });
});
