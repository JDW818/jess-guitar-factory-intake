import { jobCost, margin, tierRank } from "@/lib/engine";
import { JOB_STATUSES, ROSTER, type Job } from "@/lib/shop";
import { Card, TierBadge, marginColor, pct, usd } from "./ui";

export function Pipeline({ jobs, onChange }: { jobs: Job[]; onChange: (id: string, patch: Partial<Job>) => void }) {
  const select = "rounded-md border border-[var(--line)] bg-[var(--background)] px-2 py-1 text-sm";
  return (
    <Card title="Pipeline" action={<span className="text-xs text-[var(--muted)]">reassign to see margin move</span>}>
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-[var(--muted)]">
            <tr className="[&_th]:pb-2 [&_th]:font-medium">
              <th>Job</th><th>Tier</th><th>Builder</th><th>Status</th><th>Progress</th><th className="text-right">Price</th><th className="text-right">Margin</th>
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
                      {ROSTER.filter((b) => tierRank(b.tier) >= tierRank(j.tier)).map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({b.tier})</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select className={select} value={j.status} onChange={(e) => onChange(j.id, { status: e.target.value as Job["status"] })}>
                      {JOB_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
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
