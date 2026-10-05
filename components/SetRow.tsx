"use client";

import type { Compare } from "@/lib/progression";
import { formatSet } from "@/lib/progression";
import type { SetEntry } from "@/lib/storage";
import { Stepper } from "./Stepper";

type Props = {
  index: number;
  value: SetEntry;
  done: boolean;
  /** Only the next set can be ticked and only the latest done set can be undone. */
  canToggle: boolean;
  bodyweight: boolean;
  weightStep: number;
  compare?: Compare;
  onWeight: (w: number) => void;
  onReps: (r: number) => void;
  onToggle: () => void;
};

const MARK: Record<Compare, { sym: string; text: string }> = {
  better: { sym: "▲", text: "better than last time" },
  same: { sym: "=", text: "same as last time" },
  worse: { sym: "▼", text: "less than last time" },
};

export function SetRow(p: Props) {
  return (
    <li className={`set-row${p.done ? " done" : ""}`}>
      <div className="set-head">
        <span className="set-label">Set {p.index + 1}</span>
        {p.done && p.compare && (
          <span className={`mark mark-${p.compare}`} aria-label={MARK[p.compare].text}>
            {MARK[p.compare].sym}
          </span>
        )}
      </div>

      <div className="set-body">
        {p.done ? (
          <div className="set-logged num">{formatSet(p.value, p.bodyweight)}</div>
        ) : (
          <>
            {!p.bodyweight && (
              <Stepper label="kg" value={p.value.weight} step={p.weightStep} decimal onChange={p.onWeight} />
            )}
            <Stepper label="reps" value={p.value.reps} step={1} decimal={false} onChange={p.onReps} />
          </>
        )}
      </div>

      <button
        type="button"
        className="tick"
        aria-pressed={p.done}
        aria-label={p.done ? `Undo set ${p.index + 1}` : `Log set ${p.index + 1}`}
        disabled={!p.canToggle}
        onClick={p.onToggle}
      >
        <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </li>
  );
}
