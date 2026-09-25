import { builderLoad, teamStats, utilLevel, type UtilLevel } from "@/lib/engine";
import { PLANNING_WEEKS, ROSTER, type Job } from "@/lib/shop";
import { Card, TierBadge, pct, usd } from "./ui";

const BAR: Record<UtilLevel, string> = {
  overloaded: "bg-red-500",
  over: "bg-amber-500",
  on: "bg-emerald-500",
  bench: "bg-sky-400",
};

export function Team({ jobs }: { jobs: Job[] }) {
  const stats = teamStats(jobs);
  return (
    <Card title={`Team · next ${PLANNING_WEEKS} weeks`}>
      <dl className="mb-4 grid grid-cols-3 gap-2 text-center">
        {[
          ["Utilization", `${pct(stats.utilization)}`, `target ${pct(stats.target)}`],
          ["Booked", usd(stats.booked), "open work"],
          ["Margin", pct(stats.margin), "blended"],
        ].map(([k, v, sub]) => (
          <div key={k} className="rounded-lg bg-[var(--background)] p-2">
            <dt className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{k}</dt>
            <dd className="font-mono text-base font-semibold">{v}</dd>
            <dd className="text-[10px] text-[var(--muted)]">{sub}</dd>
          </div>
        ))}
      </dl>

      <ul className="space-y-3">
        {ROSTER.map((b) => {
          const load = builderLoad(b, jobs);
          const level = utilLevel(load.util, b.utilTarget);
          return (
            <li key={b.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 font-medium">{b.name} <TierBadge tier={b.tier} /></span>
                <span className="font-mono text-xs">
                  {pct(load.util)}<span className="text-[var(--muted)]"> / {pct(b.utilTarget)}</span>
                </span>
              </div>
              <div className="relative mt-1 h-2 rounded-full bg-[var(--line)]">
                <div className={`h-full rounded-full ${BAR[level]}`} style={{ width: `${Math.min(load.util, 1) * 100}%` }} />
                <div className="absolute -top-0.5 h-3 w-0.5 bg-[var(--foreground)]" style={{ left: `${b.utilTarget * 100}%` }} title={`Target ${pct(b.utilTarget)}`} />
              </div>
              <p className="mt-1 truncate text-xs text-[var(--muted)]" title={load.jobs.map((j) => j.title).join(", ")}>
                {load.jobs.map((j) => j.title).join(" · ") || "Available"}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[11px] text-[var(--muted)]">Bar = booked share of their week. Tick = utilization target. Masters run lower to leave room for design reviews and mentoring.</p>
    </Card>
  );
}
