import { fmt } from "@/lib/dates";
import { isLate, jobCost, margin, skillGaps } from "@/lib/engine";
import { JOB_STATUSES, type Builder, type Job } from "@/lib/shop";
import { Card, TierBadge, marginColor, pct, usd } from "./ui";

export function Pipeline({ jobs, roster, onChange }: { jobs: Job[]; roster: Builder[]; onChange: (id: string, patch: Partial<Job>) => void }) {
  const select = "rounded-md border border-[var(--line)] bg-[var(--background)] px-2 py-1 text-sm";
  return (
    <Card title="Pipeline" action={<span className="text-xs text-[var(--muted)]">reassign to see margin move</span>}>
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-[var(--muted)]">
            <tr className="[&_th]:pb-2 [&_th]:font-medium">
              <th>Job</th><th>Tier</th><th>Builder</th><th>Status</th><th>Dates</th><th>Progress</th><th className="text-right">Price</th><th className="text-right">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {jobs.map((j) => {
              const m = margin(j.price, jobCost(j));
              return (
                <tr key={j.id} className={`[&_td]:py-2.5 ${j.status === "Delivered" ? "opacity-50" : ""}`}>
                  <td>
                    <p className="font-medium">{j.needsReview && <span title="Needs review">⚑ </span>}{j.title}</p>
                    <p className="text-xs text-[var(--muted)]">{j.customer}</p>
                  </td>
                  <td><TierBadge tier={j.tier} /></td>
                  <td>
                    <select className={select} value={j.assigneeId} onChange={(e) => onChange(j.id, { assigneeId: e.target.value })}>
                      {roster.map((b) => {
                        const g = skillGaps(j, b);
                        return <option key={b.id} value={b.id}>{g.underLeveled || g.missing.length ? "⚠ " : ""}{b.name} ({b.tier})</option>;
                      })}
                    </select>
                  </td>
                  <td>
                    <select className={select} value={j.status} onChange={(e) => onChange(j.id, { status: e.target.value as Job["status"] })}>
                      {JOB_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className={`text-xs ${isLate(j) ? "font-semibold text-amber-600" : ""}`}>{fmt(j.start)} – {fmt(j.end)}{j.due && <span className="block text-[var(--muted)]">due {fmt(j.due)}</span>}</td>
                  <td className="font-mono text-xs">{j.hoursDone}/{j.hours}h</td>
                  <td className="text-right font-mono">{usd(j.price)}</td>
                  <td className={`text-right font-mono font-semibold ${marginColor(m)}`}>{pct(m)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
