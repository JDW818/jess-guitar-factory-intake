import { builderLoad, remainingHours } from "@/lib/engine";
import { ROSTER, type Job } from "@/lib/shop";
import { Card, LoadBar, TierBadge, pct } from "./ui";

export function Capacity({ jobs }: { jobs: Job[] }) {
  return (
    <Card title="Builder capacity · next 4 weeks">
      <div className="divide-y divide-[var(--line)]">
        {ROSTER.map((b) => {
          const load = builderLoad(b, jobs);
          return (
            <div key={b.id} className="grid gap-3 py-4 md:grid-cols-[14rem_1fr]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{b.name}</span>
                  <TierBadge tier={b.tier} />
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">{b.skills.join(" · ")}</p>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <LoadBar value={load.load4wk} />
                  <span className="w-12 shrink-0 text-right font-mono text-sm">{pct(load.load4wk)}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {load.remaining}h booked · free in {load.backlogWeeks.toFixed(1)} wks · {b.weeklyHours}h/wk
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {load.jobs.map((j) => (
                    <span key={j.id} className="rounded-md border border-[var(--line)] bg-[var(--background)] px-2 py-0.5 text-xs">
                      {j.title} <span className="text-[var(--muted)]">· {remainingHours(j)}h</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
