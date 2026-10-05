"use client";

import { PLAN } from "@/lib/plan";

type Props = { selected: number | null; onSelect: (day: number) => void };

export function DayTabs({ selected, onSelect }: Props) {
  return (
    <nav className="day-tabs" aria-label="Day">
      {PLAN.map((d) => (
        <button
          key={d.day}
          type="button"
          className="day-tab"
          data-type={d.type}
          aria-pressed={selected === d.day}
          onClick={() => onSelect(d.day)}
        >
          {d.short}
        </button>
      ))}
    </nav>
  );
}
