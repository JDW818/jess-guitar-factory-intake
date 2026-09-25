import { builderLoad, flags as allFlags, skillGaps, utilLevel, weekLabel } from "@/lib/engine";
import { dayIndex, fmt } from "@/lib/dates";
import { PLANNING_WEEKS, TIMELINE_WEEKS, type Builder, type Job } from "@/lib/shop";
import { at, WeekAxis, WeekGrid } from "./timeline";
import { BAR_STYLES, Card, TierBadge, UTIL_CELL, UTIL_TEXT, UtilLegend, pct } from "./ui";

// Greedy lane packing so concurrent jobs stack instead of overlapping.
function lanes(jobs: Job[]) {
  const out: Job[][] = [];
  for (const j of [...jobs].sort((a, z) => a.start.localeCompare(z.start))) {
    const lane = out.find((l) => l[l.length - 1].end < j.start);
    if (lane) lane.push(j);
    else out.push([j]);
  }
  return out;
}

export function Capacity({ jobs, roster, onTarget }: { jobs: Job[]; roster: Builder[]; onTarget: (id: string, t: number) => void }) {
  const flags = allFlags(jobs, roster);
  return (
    <Card title={`People · utilization vs target · next ${TIMELINE_WEEKS} weeks`} action={<UtilLegend />}>
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[15rem_1fr] gap-4 pb-2">
            <div />
            <WeekAxis />
          </div>

          <div className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
            {roster.map((b) => {
              const load = builderLoad(b, jobs);
              const level = utilLevel(load.util, b.utilTarget);
              const fitIssues = flags.filter((f) => f.builderId === b.id && (f.kind === "skill" || f.kind === "tier")).length;
              return (
                <div key={b.id} className="grid grid-cols-[15rem_1fr] gap-4 py-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{b.name}</span>
                      <TierBadge tier={b.tier} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      <label htmlFor={`t-${b.id}`}>Target</label>
                      <input
                        id={`t-${b.id}`}
                        type="number" min={40} max={100} step={5}
                        value={Math.round(b.utilTarget * 100)}
                        onChange={(e) => onTarget(b.id, Number(e.target.value) / 100)}
                        className="w-14 rounded border border-[var(--line)] bg-[var(--background)] px-1.5 py-0.5 text-right font-mono text-[var(--foreground)]"
                      />
                      <span>% · {b.weeklyHours}h/wk</span>
                    </div>
                    <p className="text-xs">
                      <span className={`font-mono font-semibold ${UTIL_TEXT[level]}`}>{pct(load.util)}</span>
                      <span className="text-[var(--muted)]"> next {PLANNING_WEEKS} wks · peak {pct(load.peak)}</span>
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {load.overloadedWeeks.length
                        ? <span className="font-semibold text-red-600">Over 100% for {load.overloadedWeeks.length} wk{load.overloadedWeeks.length > 1 ? "s" : ""}</span>
                        : load.overWeeks.length
                          ? <span className="font-semibold text-amber-600">Over target for {load.overWeeks.length} wk{load.overWeeks.length > 1 ? "s" : ""}</span>
                          : load.benchHours > 0 ? `${load.benchHours}h open to target` : "At target"}
                      {fitIssues > 0 && <span className="font-semibold text-red-600"> · {fitIssues} fit issue{fitIssues > 1 ? "s" : ""}</span>}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="grid grid-cols-12 gap-px overflow-hidden rounded-md">
                      {load.weeks.map((w, i) => (
                        <div
                          key={i}
                          title={`Week of ${weekLabel(i)}: ${Math.round(w.hours)}h booked · ${pct(w.util)} vs ${pct(b.utilTarget)} target`}
                          className={`py-1 text-center font-mono text-[10px] ${w.hours ? UTIL_CELL[utilLevel(w.util, b.utilTarget)] : "bg-[var(--line)] text-[var(--muted)]"}`}
                        >
                          {w.hours ? pct(w.util) : "–"}
                        </div>
                      ))}
                    </div>
                    <div className="relative" style={{ height: Math.max(1, lanes(load.jobs).length) * 26 }}>
                      <WeekGrid />
                      {lanes(load.jobs).map((lane, li) =>
                        lane.map((j) => {
                          const s = dayIndex(j.start), e = dayIndex(j.end) + 1;
                          if (e <= 0 || s >= TIMELINE_WEEKS * 7) return null;
                          const g = skillGaps(j, b);
                          const misfit = g.missing.length > 0 || g.underLeveled;
                          return (
                            <div
                              key={j.id}
                              title={`${j.title} · ${j.customer}\n${fmt(j.start)} – ${fmt(j.end)}${j.due ? ` · due ${fmt(j.due)}` : ""}${misfit ? `\n⚠ ${g.underLeveled ? `needs ${j.tier}` : ""} ${g.missing.join(", ")}` : ""}`}
                              className={`absolute flex h-[22px] items-center overflow-hidden rounded px-1.5 text-[11px] font-medium ring-1 ring-inset ${BAR_STYLES[j.tier]} ${j.status === "Scheduled" ? "opacity-70" : ""} ${misfit ? "!ring-2 !ring-red-500" : ""}`}
                              style={{ top: li * 26, left: at(s), width: `calc(${at(e)} - ${at(s)} - 2px)` }}
                            >
                              <span className="truncate">{misfit && "⚠ "}{j.title}</span>
                            </div>
                          );
                        }),
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Each job&apos;s remaining hours are spread across its dates; concurrent jobs stack. Cells show booked hours as a share of the builder&apos;s week. Red outline = assigned outside skills or tier.
      </p>
    </Card>
  );
}
