"use client";

import { useEffect } from "react";
import type { Exercise } from "@/lib/plan";
import { formatDay } from "@/lib/dates";
import { compareSet, formatKg, formatSet, lastSession, target, type Target } from "@/lib/progression";
import { keepAwake } from "@/lib/pwa";
import { getSessions, type SetEntry } from "@/lib/storage";
import { SetRow } from "./SetRow";

type Props = {
  exercise: Exercise;
  today: string;
  /** Edited-but-not-ticked values, by row index. */
  draft: (SetEntry | null)[];
  extra: boolean;
  onDraft: (draft: (SetEntry | null)[]) => void;
  onAddSet: () => void;
  onLog: (index: number, set: SetEntry) => void;
  onUndo: (index: number, set: SetEntry) => void;
  onBack: () => void;
};

function planLine(ex: Exercise, t: Target): string {
  switch (t.reason) {
    case "first":
      return ex.kind === "bodyweight" ? "First time. Do what you can." : "First time. Enter your weight.";
    case "add-weight":
      return `You hit the top last time. +${formatKg(t.weightIncrease)} kg, start at ${ex.repMin} reps.`;
    case "top-bodyweight":
      return "Top of range — slow the reps down or add weight.";
    case "add-reps":
      return "Same weight. Beat last time by 1 rep per set.";
  }
}

export function ExerciseScreen({ exercise: ex, today, draft, extra, onDraft, onAddSet, onLog, onUndo, onBack }: Props) {
  useEffect(() => keepAwake(), []);

  const sessions = getSessions(ex.id);
  const last = lastSession(sessions, today);
  const t = target(ex, last);
  const done = sessions.find((s) => s.date === today)?.sets ?? [];
  const bw = ex.kind === "bodyweight";
  const weightStep = ex.kind === "iso" ? 1 : ex.jump;
  const rows = Math.max(ex.sets + (extra ? 1 : 0), done.length);
  const allDone = done.length >= ex.sets;

  const fallback = done[done.length - 1] ?? t.sets[t.sets.length - 1];
  const valueAt = (i: number): SetEntry => (i < done.length ? done[i] : draft[i] ?? t.sets[i] ?? fallback);

  const setWeight = (i: number, weight: number) => {
    const next = [...draft];
    // Also prefill the new weight into the not-yet-done sets below.
    for (let j = i; j < rows; j++) if (j >= done.length) next[j] = { ...valueAt(j), weight };
    onDraft(next);
  };
  const setReps = (i: number, reps: number) => {
    const next = [...draft];
    next[i] = { ...valueAt(i), reps };
    onDraft(next);
  };

  return (
    <section className="screen exercise">
      <button type="button" className="back" onClick={onBack}>
        ‹ Today
      </button>
      <h1 className="ex-title">{ex.name}</h1>
      <p className="scheme num">
        {ex.sets} × {ex.repMin === ex.repMax ? ex.repMin : `${ex.repMin}–${ex.repMax}`}
        {ex.note && <span className="note"> · {ex.note}</span>}
      </p>

      <div className="last-block">
        <h2 className="block-title">Last time</h2>
        {last ? (
          <>
            <p className="muted">{formatDay(last.date)}</p>
            <p className="last-sets num">
              {last.sets.map((s, i) => (
                <span key={i}>{formatSet(s, bw)}</span>
              ))}
            </p>
          </>
        ) : (
          <p className="muted">Not done yet</p>
        )}
      </div>

      <p className="plan-line">{planLine(ex, t)}</p>

      <ol className="set-list">
        {Array.from({ length: rows }, (_, i) => {
          const isDone = i < done.length;
          return (
            <SetRow
              key={i}
              index={i}
              value={valueAt(i)}
              done={isDone}
              canToggle={i === done.length || i === done.length - 1}
              bodyweight={bw}
              weightStep={weightStep}
              compare={isDone ? compareSet(done[i], last?.sets[i]) : undefined}
              onWeight={(w) => setWeight(i, w)}
              onReps={(r) => setReps(i, r)}
              onToggle={() => (isDone ? onUndo(i, done[i]) : onLog(i, valueAt(i)))}
            />
          );
        })}
      </ol>

      {!extra && rows === ex.sets && (
        <button type="button" className="link-btn" onClick={onAddSet}>
          + Add set
        </button>
      )}

      {allDone && (
        <div className="done-block">
          <p className="done-text">Done ✓</p>
          <button type="button" className="primary" onClick={onBack}>
            Back to today
          </button>
        </div>
      )}
    </section>
  );
}
