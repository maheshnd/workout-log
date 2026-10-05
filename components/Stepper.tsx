"use client";

import { useState } from "react";
import { formatKg } from "@/lib/progression";

type Props = {
  label: string; // "kg" or "reps"
  value: number;
  step: number;
  decimal: boolean;
  onChange: (v: number) => void;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function Stepper({ label, value, step, decimal, onChange }: Props) {
  const [text, setText] = useState<string | null>(null);

  const commit = () => {
    if (text === null) return;
    const n = decimal ? parseFloat(text.replace(",", ".")) : parseInt(text, 10);
    if (Number.isFinite(n) && n >= 0) onChange(round2(n));
    setText(null);
  };

  return (
    <div className="stepper">
      <button
        type="button"
        className="step-btn"
        aria-label={`Less ${label}`}
        onClick={() => onChange(Math.max(0, round2(value - step)))}
      >
        −
      </button>
      {text === null ? (
        <button
          type="button"
          className="step-value"
          aria-label={`${formatKg(value)} ${label}, tap to type`}
          onClick={() => setText(formatKg(value))}
        >
          <span className="num">{formatKg(value)}</span>
          <span className="unit">{label}</span>
        </button>
      ) : (
        <input
          className="step-input num"
          autoFocus
          inputMode={decimal ? "decimal" : "numeric"}
          enterKeyHint="done"
          aria-label={label}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={(e) => {
            e.target.select();
            const el = e.target;
            setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setText(null);
          }}
        />
      )}
      <button
        type="button"
        className="step-btn"
        aria-label={`More ${label}`}
        onClick={() => onChange(round2(value + step))}
      >
        +
      </button>
    </div>
  );
}
