"use client";

import { useRef } from "react";
import { builderLoad, flags as allFlags, isLate, recommendations, skillGaps, utilLevel, type Flag } from "@/lib/engine";
import { addDays, dayIndex, fmt } from "@/lib/dates";
import { JOB_STATUSES, PLANNING_WEEKS, type Builder, type Job } from "@/lib/shop";
import { at, TOTAL_DAYS, WeekAxis, WeekGrid } from "./timeline";
import { BAR_STYLES, Card, TierBadge, UTIL_CELL, UTIL_TEXT, UtilLegend, pct } from "./ui";

type Props = { jobs: Job[]; roster: Builder[]; onChange: (id: string, patch: Partial<Job>) => void };

const FLAG_STYLES: Record<Flag["kind"], string> = {
  overloaded: "bg-red-100 text-red-900",
  "over-target": "bg-amber-100 text-amber-950",
  skill: "bg-red-100 text-red-900",
  tier: "bg-red-100 text-red-900",
  late: "bg-amber-100 text-amber-950",
};

export function Schedule({ jobs, roster, onChange }: Props) {
  const recs = recommendations(jobs, roster);
  const flags = allFlags(jobs, roster);
  const open = jobs.filter((j) => j.status !== "Delivered");

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Card title={`Staffing recommendations · ${recs.length}`}>
          {recs.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              {flags.length
                ? "No safe automatic fix for the open flags. They involve work already underway or no qualified builder with room, so they need a judgment call."
                : "Nothing to rebalance. Everyone is within target and on work that fits."}
            </p>
          ) : (
            <ul className="space-y-3">
              {recs.map((r) => (
                <li key={r.id} className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--background)] p-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{r.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{r.detail}</p>
                  </div>
                  <button
                    onClick={() => onChange(r.jobId, r.patch)}
                    className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110"
                  >
                    Apply
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Flags · ${flags.length}`}>
          {flags.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">All clear.</p>
          ) : (
            <ul className="space-y-1.5">
              {flags.map((f, i) => (
                <li key={i} className={`rounded-lg px-2.5 py-1.5 text-xs ${FLAG_STYLES[f.kind]}`}>{f.text}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card
        title="Master schedule"
        action={<span className="text-xs text-[var(--muted)]">drag a bar to move it, drag its edges to change dates</span>}
      >
        <div className="-mx-5 overflow-x-auto px-5">
          <div className="min-w-[1100px]">
            <div className="grid grid-cols-[26rem_1fr] gap-4 pb-2">
              <div />
              <WeekAxis />
            </div>

            {roster.map((b) => {
              const load = builderLoad(b, jobs);
              const mine = open.filter((j) => j.assigneeId === b.id);
              return (
                <div key={b.id} className="border-t border-[var(--line)]">
                  {/* Builder header: live utilization strip */}
                  <div className="grid grid-cols-[26rem_1fr] items-center gap-4 bg-[var(--background)] py-2">
                    <div className="flex items-center gap-2 px-1">
                      <span className="font-semibold">{b.name}</span>
                      <TierBadge tier={b.tier} />
                      <span className="text-xs text-[var(--muted)]">
                        <span className={`font-mono font-semibold ${UTIL_TEXT[utilLevel(load.util, b.utilTarget)]}`}>{pct(load.util)}</span>
                        {" "}next {PLANNING_WEEKS} wks · target {pct(b.utilTarget)}
                      </span>
                    </div>
                    <div className="grid grid-cols-12 gap-px overflow-hidden rounded">
                      {load.weeks.map((w, i) => (
                        <div
                          key={i}
                          className={`h-4 text-center font-mono text-[9px] leading-4 ${w.hours ? UTIL_CELL[utilLevel(w.util, b.utilTarget)] : "bg-[var(--line)] text-[var(--muted)]"}`}
                        >
                          {w.hours ? pct(w.util) : ""}
                        </div>
                      ))}
                    </div>
                  </div>

                  {mine.length === 0 && <p className="px-1 pb-3 text-xs text-[var(--muted)]">No open jobs.</p>}
                  {mine.map((j) => (
                    <JobRow key={j.id} job={j} builder={b} roster={roster} onChange={(patch) => onChange(j.id, patch)} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3"><UtilLegend /></div>
      </Card>
    </div>
  );
}

function JobRow({ job, builder, roster, onChange }: { job: Job; builder: Builder; roster: Builder[]; onChange: (p: Partial<Job>) => void }) {
  const g = skillGaps(job, builder);
  const misfit = g.missing.length > 0 || g.underLeveled;
  const late = isLate(job);
  const input = "rounded border border-[var(--line)] bg-[var(--background)] px-1.5 py-0.5 text-xs";

  return (
    <div className="grid grid-cols-[26rem_1fr] items-center gap-4 border-t border-dashed border-[var(--line)] py-2">
      <div className="space-y-1.5 px-1">
        <div className="flex items-baseline gap-2">
          <TierBadge tier={job.tier} />
          <p className="truncate text-sm font-medium" title={job.title}>
            {job.needsReview && "⚑ "}{job.title}
          </p>
          <span className="truncate text-xs text-[var(--muted)]">{job.customer}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <select className={input} value={job.assigneeId} onChange={(e) => onChange({ assigneeId: e.target.value })} aria-label="Builder">
            {roster.map((b) => {
              const gg = skillGaps(job, b);
              const bad = gg.underLeveled || gg.missing.length > 0;
              return <option key={b.id} value={b.id}>{bad ? "⚠ " : ""}{b.name} ({b.tier})</option>;
            })}
          </select>
          <select className={input} value={job.status} onChange={(e) => onChange({ status: e.target.value as Job["status"] })} aria-label="Status">
            {JOB_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <input type="date" className={input} value={job.start} max={job.end} onChange={(e) => e.target.value && onChange({ start: e.target.value })} aria-label="Start" />
          <span className="text-[var(--muted)]">→</span>
          <input type="date" className={input} value={job.end} min={job.start} onChange={(e) => e.target.value && onChange({ end: e.target.value })} aria-label="End" />
          <label className="ml-1 flex items-center gap-1 text-[var(--muted)]">
            Due
            <input type="date" className={input} value={job.due ?? ""} onChange={(e) => onChange({ due: e.target.value || null })} />
          </label>
          {late && <span className="font-semibold text-amber-600">Late by {dayIndex(job.end) - dayIndex(job.due!)}d</span>}
          {g.underLeveled && <span className="font-semibold text-red-600">Needs {job.tier}</span>}
          {g.missing.length > 0 && <span className="font-semibold text-red-600">Missing {g.missing.join(", ")}</span>}
        </div>
      </div>

      <GanttTrack job={job} misfit={misfit} late={late} onChange={onChange} />
    </div>
  );
}

type DragState = { x: number; width: number; mode: "move" | "start" | "end"; start: string; end: string };

function GanttTrack({ job, misfit, late, onChange }: { job: Job; misfit: boolean; late: boolean; onChange: (p: Partial<Job>) => void }) {
  const drag = useRef<DragState | null>(null);
  const track = useRef<HTMLDivElement>(null);

  const s = dayIndex(job.start);
  const e = dayIndex(job.end) + 1;
  const due = job.due ? dayIndex(job.due) + 1 : null;
  const visible = e > 0 && s < TOTAL_DAYS;

  function begin(ev: React.PointerEvent, mode: DragState["mode"]) {
    ev.preventDefault();
    ev.stopPropagation();
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
    drag.current = { x: ev.clientX, width: track.current!.getBoundingClientRect().width, mode, start: job.start, end: job.end };
  }

  function move(ev: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const days = Math.round(((ev.clientX - d.x) / d.width) * TOTAL_DAYS);
    if (d.mode === "move") onChange({ start: addDays(d.start, days), end: addDays(d.end, days) });
    else if (d.mode === "start") { const start = addDays(d.start, days); if (start <= d.end) onChange({ start }); }
    else { const end = addDays(d.end, days); if (end >= d.start) onChange({ end }); }
  }

  const end = () => (drag.current = null);

  return (
    <div ref={track} className="relative h-9 select-none">
      <WeekGrid />
      {due != null && due > 0 && due <= TOTAL_DAYS && (
        <div className="absolute inset-y-0 z-10 border-l-2 border-dashed border-red-400" style={{ left: at(due) }} title={`Due ${fmt(job.due!)}`}>
          <span className="absolute -top-1 -left-[5px] text-[10px] text-red-500">◆</span>
        </div>
      )}
      {visible && (
        <div
          onPointerDown={(ev) => begin(ev, "move")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          title={`${fmt(job.start)} – ${fmt(job.end)}${job.due ? ` · due ${fmt(job.due)}` : ""}`}
          className={`group absolute inset-y-1.5 flex cursor-grab items-center overflow-hidden rounded-md px-2 text-xs font-medium ring-1 ring-inset active:cursor-grabbing ${BAR_STYLES[job.tier]} ${job.status === "Scheduled" ? "opacity-75" : ""} ${misfit ? "!ring-2 !ring-red-500" : late ? "!ring-2 !ring-amber-500" : ""}`}
          style={{ left: at(s), width: `calc(${at(e)} - ${at(s)})` }}
        >
          <span onPointerDown={(ev) => begin(ev, "start")} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize group-hover:bg-black/10" />
          <span className="truncate">
            {s < 0 && "← "}{fmt(job.start)} – {fmt(job.end)}
          </span>
          <span onPointerDown={(ev) => begin(ev, "end")} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize group-hover:bg-black/10" />
        </div>
      )}
    </div>
  );
}
