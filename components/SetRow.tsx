"use client";

import type { Compare } from "@/lib/progression";
import { formatWeight } from "@/lib/progression";
import type { SetEntry } from "@/lib/storage";
import type { Unit } from "@/lib/units";
import { Stepper } from "./Stepper";

type Props = {
  index: number;
  value: SetEntry;
  done: boolean;
  /** Any done set can be undone; only the next set (with reps > 0) can be ticked. */
  canToggle: boolean;
  bodyweight: boolean;
  unit: Unit;
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
          <div className="set-logged">
            {!(p.bodyweight && p.value.weight === 0) && (
              <>
                <span className="num">{formatWeight(p.value.weight)}</span>
                <span className="unit">{p.unit}</span>
                <span className="times">×</span>
              </>
            )}
            <span className="num">{p.value.reps}</span>
            <span className="unit">reps</span>
          </div>
        ) : (
          <>
            {!p.bodyweight && (
              <Stepper label={p.unit} value={p.value.weight} step={p.weightStep} decimal onChange={p.onWeight} />
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
