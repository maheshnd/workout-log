"use client";

import type { Day } from "@/lib/plan";
import { formatKg, formatSets, lastSession, target } from "@/lib/progression";
import { getSessions } from "@/lib/storage";

type Props = { day: Day; today: string; onOpen: (exerciseId: string) => void };

export function ExerciseList({ day, today, onOpen }: Props) {
  return (
    <ul className="ex-list">
      {day.exercises.map((ex) => {
        const sessions = getSessions(ex.id);
        const last = lastSession(sessions, today);
        const t = target(ex, last);
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
                <span className="num">{last ? formatSets(last.sets, bw) : "Not done yet"}</span>
              </span>
              <span className="ex-line">
                <span className="ex-key">Today</span>
                <span className="num">
                  {t.reason === "first" && !bw
                    ? `enter kg · ${t.sets.map((s) => s.reps).join(" ")}`
                    : formatSets(t.sets, bw)}
                </span>
                {t.weightIncrease > 0 && <span className="badge num">+{formatKg(t.weightIncrease)} kg</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
