// Shared week axis + positioning for the Gantt-style views. Day 0 = today.
import { weekLabel } from "@/lib/engine";
import { TIMELINE_WEEKS } from "@/lib/shop";

export const TOTAL_DAYS = TIMELINE_WEEKS * 7;
export const at = (day: number) => `${(Math.max(0, Math.min(day, TOTAL_DAYS)) / TOTAL_DAYS) * 100}%`;

export function WeekAxis() {
  return (
    <div className="relative h-5 text-xs text-[var(--muted)]">
      {Array.from({ length: TIMELINE_WEEKS }, (_, w) => (
        <span key={w} className="absolute whitespace-nowrap" style={{ left: at(w * 7) }}>{w === 0 ? "Today" : weekLabel(w)}</span>
      ))}
    </div>
  );
}

export function WeekGrid() {
  return (
    <>
      {Array.from({ length: TIMELINE_WEEKS }, (_, w) => (
        <div key={w} className="pointer-events-none absolute inset-y-0 border-l border-[var(--line)]" style={{ left: at(w * 7) }} />
      ))}
    </>
  );
}
