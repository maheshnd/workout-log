import { describe, expect, it } from "vitest";
import { BAD_FILE, buildExport, mergeSessions, parseImport } from "./exportImport";
import type { Session } from "./storage";

const s = (date: string, exerciseId: string, weight: number): Session => ({
  date,
  exerciseId,
  plannedSets: 4,
  repMin: 6,
  repMax: 8,
  sets: [{ weight, reps: 8 }],
});

describe("parseImport", () => {
  it("round-trips an export", () => {
    const sessions = [s("2026-10-01", "bench-press", 60)];
    const r = parseImport(JSON.stringify(buildExport(sessions, new Date())));
    expect(r).toEqual({ ok: true, sessions });
  });

  it.each([
    ["not json", "{"],
    ["random json", JSON.stringify({ hello: "world" })],
    ["wrong app", JSON.stringify({ app: "x", version: 1, sessions: [] })],
    ["wrong version", JSON.stringify({ app: "gym-log", version: 2, sessions: [] })],
    ["bad date", JSON.stringify({ app: "gym-log", version: 1, sessions: [s("2026-13-01", "a", 1)] })],
    ["negative weight", JSON.stringify({ app: "gym-log", version: 1, sessions: [s("2026-10-01", "a", -1)] })],
  ])("rejects %s", (_, text) => {
    expect(parseImport(text)).toEqual({ ok: false, error: BAD_FILE });
  });

  it("rejects the whole file if one session is bad", () => {
    const text = JSON.stringify({
      app: "gym-log",
      version: 1,
      sessions: [s("2026-10-01", "bench-press", 60), { date: "2026-10-02", exerciseId: 5, sets: [] }],
    });
    expect(parseImport(text).ok).toBe(false);
  });
});

describe("mergeSessions", () => {
  it("file wins on same (date, exerciseId), everything else is kept", () => {
    const merged = mergeSessions(
      [s("2026-10-01", "bench-press", 60), s("2026-10-01", "ohp", 40)],
      [s("2026-10-01", "bench-press", 65), s("2026-10-02", "deadlift", 140)],
    );
    expect(merged).toHaveLength(3);
    expect(merged.find((x) => x.exerciseId === "bench-press")?.sets[0].weight).toBe(65);
  });
});
