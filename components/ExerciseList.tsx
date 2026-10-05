"use client";

import type { Day } from "@/lib/plan";
import { formatSets, formatWeight, lastSession, target } from "@/lib/progression";
import { getSessions } from "@/lib/storage";
import { jumpFor, sessionsToUnit, type Unit } from "@/lib/units";

type Props = { day: Day; today: string; unit: Unit; onOpen: (exerciseId: string) => void };

export function ExerciseList({ day, today, unit, onOpen }: Props) {
  return (
    <ul className="ex-list">
      {day.exercises.map((ex) => {
        const sessions = sessionsToUnit(getSessions(ex.id), unit);
        const last = lastSession(sessions, today);
        const t = target(ex, last, jumpFor(ex, unit));
        const doneCount = sessions.find((s) => s.date === today)?.sets.length ?? 0;
        const bw = ex.kind === "bodyweight";
        const complete = doneCount >= ex.sets;
        return (
          <li key={ex.id}>
            <button type="button" className="ex-row" onClick={() => onOpen(ex.id)}>
              <span className="ex-top">
                <span className="ex-name">{ex.name}</span>
                <span className={`progress num${complete ? " complete" : ""}`}>
                  {doneCount}/{ex.sets}
                  {complete && <span aria-label="all sets done"> ✓</span>}
                </span>
              </span>
              <span className="scheme num">
                {ex.sets} × {ex.repMin === ex.repMax ? ex.repMin : `${ex.repMin}–${ex.repMax}`}
              </span>
              <span className="ex-line">
                <span className="ex-key">Last</span>
                <span className="num">{last ? formatSets(last.sets, bw, unit) : "Not done yet"}</span>
              </span>
              <span className="ex-line">
                <span className="ex-key">Today</span>
                <span className="num">
                  {t.reason === "first" && !bw
                    ? `enter ${unit} · ${t.sets.map((s) => s.reps).join(" ")}`
                    : formatSets(t.sets, bw, unit)}
                </span>
                {t.weightIncrease > 0 && <span className="badge num">+{formatWeight(t.weightIncrease)} {unit}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
