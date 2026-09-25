// Deterministic pricing, capacity, flags and staffing. The model scopes; this decides.
import { addDays, dayIndex, fmt, fromToday } from "./dates";
import type { Scope } from "./scope-schema";
import {
  CONCURRENCY_SHARE, MATERIALS_MARKUP, PLANNING_WEEKS, ROSTER, RUSH_SURCHARGE, SPECIALISTS, TIER_ORDER, TIERS,
  TIMELINE_WEEKS, UTIL_TOLERANCE,
  type Builder, type Job, type Skill, type Targets, type Tier,
} from "./shop";

export const tierRank = (t: Tier) => TIER_ORDER.indexOf(t);
const builderById = (roster: Builder[], id: string) => roster.find((b) => b.id === id)!;
const active = (jobs: Job[]) => jobs.filter((j) => j.status !== "Delivered");
const max = (xs: number[]) => xs.reduce((m, x) => Math.max(m, x), 0);

// The roster with any utilization targets the lead has adjusted.
export const withTargets = (targets: Targets): Builder[] =>
  ROSTER.map((b) => (targets[b.id] != null ? { ...b, utilTarget: targets[b.id] } : b));

export function remainingHours(job: Job) {
  return job.status === "Delivered" ? 0 : Math.max(0, job.hours - job.hoursDone);
}

export function jobCost(job: Job) {
  const b = builderById(ROSTER, job.assigneeId);
  return job.hours * TIERS[b.tier].costRate + job.materialsCost + job.specialistsCost;
}

export const margin = (price: number, cost: number) => (price > 0 ? (price - cost) / price : 0);

export const isLate = (job: Job) => job.status !== "Delivered" && job.due != null && job.end > job.due;

// ── Capacity ────────────────────────────────────────────────────────────────

// Remaining hours are spread evenly over the days left in the job's window.
// Anything past its end date lands on today (and is flagged late elsewhere).
export function jobWeeklyHours(job: Job, weeks = TIMELINE_WEEKS): number[] {
  const out = Array<number>(weeks).fill(0);
  const rem = remainingHours(job);
  if (!rem) return out;
  const from = Math.max(0, dayIndex(job.start));
  const to = Math.max(from, dayIndex(job.end));
  const perDay = rem / (to - from + 1);
  for (let w = 0; w < weeks; w++) {
    const overlap = Math.min(w * 7 + 6, to) - Math.max(w * 7, from) + 1;
    if (overlap > 0) out[w] = overlap * perDay;
  }
  return out;
}

export function builderWeeks(b: Builder, jobs: Job[]) {
  const hours = Array<number>(TIMELINE_WEEKS).fill(0);
  for (const j of active(jobs)) {
    if (j.assigneeId !== b.id) continue;
    jobWeeklyHours(j).forEach((h, w) => (hours[w] += h));
  }
  return hours.map((h) => ({ hours: h, util: h / b.weeklyHours }));
}

export type UtilLevel = "overloaded" | "over" | "on" | "bench";
export function utilLevel(util: number, target: number): UtilLevel {
  if (util > 1) return "overloaded";
  if (util > target + UTIL_TOLERANCE) return "over";
  if (util < target - 0.15) return "bench";
  return "on";
}

export function builderLoad(b: Builder, jobs: Job[]) {
  const weeks = builderWeeks(b, jobs);
  const near = weeks.slice(0, PLANNING_WEEKS);
  const nearHours = near.reduce((s, w) => s + w.hours, 0);
  return {
    weeks,
    jobs: active(jobs).filter((j) => j.assigneeId === b.id),
    util: nearHours / (b.weeklyHours * PLANNING_WEEKS),
    peak: max(weeks.map((w) => w.util)),
    overWeeks: weeks.flatMap((w, i) => (w.util > b.utilTarget + UTIL_TOLERANCE ? [i] : [])),
    overloadedWeeks: weeks.flatMap((w, i) => (w.util > 1 ? [i] : [])),
    benchHours: Math.max(0, Math.round(b.utilTarget * b.weeklyHours * PLANNING_WEEKS - nearHours)),
  };
}

const weekWindow = (job: Job): [number, number] => [
  Math.max(0, Math.floor(dayIndex(job.start) / 7)),
  Math.min(TIMELINE_WEEKS - 1, Math.max(0, Math.floor(dayIndex(job.end) / 7))),
];

// Peak utilization for a builder across the weeks a given job spans.
function peakDuring(b: Builder, jobs: Job[], job: Job) {
  const [from, to] = weekWindow(job);
  return max(builderWeeks(b, jobs).slice(from, to + 1).map((w) => w.util));
}

export function weekLabel(w: number) {
  return fmt(fromToday(w * 7));
}

// ── Fit & flags ─────────────────────────────────────────────────────────────

export function skillGaps(job: { skills: Skill[]; tier: Tier }, b: Builder) {
  return {
    missing: job.skills.filter((s) => !b.skills.includes(s)),
    underLeveled: tierRank(b.tier) < tierRank(job.tier),
  };
}

export type Flag = { kind: "overloaded" | "over-target" | "skill" | "tier" | "late"; builderId: string; jobId?: string; text: string };

const weeksText = (ws: number[]) => `${ws.length} wk${ws.length > 1 ? "s" : ""} from ${weekLabel(ws[0])}`;

export function flags(jobs: Job[], roster: Builder[]): Flag[] {
  const out: Flag[] = [];
  for (const b of roster) {
    const l = builderLoad(b, jobs);
    if (l.overloadedWeeks.length) {
      out.push({ kind: "overloaded", builderId: b.id, text: `${b.name} is over 100% for ${weeksText(l.overloadedWeeks)} (peak ${Math.round(l.peak * 100)}%)` });
    } else if (l.overWeeks.length) {
      out.push({ kind: "over-target", builderId: b.id, text: `${b.name} is over their ${Math.round(b.utilTarget * 100)}% target for ${weeksText(l.overWeeks)}` });
    }
  }
  for (const j of active(jobs)) {
    const b = builderById(roster, j.assigneeId);
    const g = skillGaps(j, b);
    if (g.underLeveled) out.push({ kind: "tier", builderId: b.id, jobId: j.id, text: `"${j.title}" needs a ${j.tier} builder; ${b.name} is ${b.tier}` });
    if (g.missing.length) out.push({ kind: "skill", builderId: b.id, jobId: j.id, text: `${b.name} lacks ${g.missing.join(", ")} for "${j.title}"` });
    if (isLate(j)) out.push({ kind: "late", builderId: b.id, jobId: j.id, text: `"${j.title}" finishes ${fmt(j.end)}, after its ${fmt(j.due!)} due date` });
  }
  return out;
}

// ── Recommendations ─────────────────────────────────────────────────────────

export type Rec = { id: string; title: string; detail: string; jobId: string; patch: Partial<Job> };

const patchJob = (jobs: Job[], id: string, patch: Partial<Job>) => jobs.map((j) => (j.id === id ? { ...j, ...patch } : j));
const pctS = (n: number) => `${Math.round(n * 100)}%`;

// Best qualified builder to take a job: right tier, every skill, and still
// within their own target across the job's window. Cheapest capable tier wins
// (protects margin), then whoever has the most room.
function bestReassignment(job: Job, jobs: Job[], roster: Builder[]) {
  const options = roster
    .filter((c) => c.id !== job.assigneeId)
    .filter((c) => { const g = skillGaps(job, c); return !g.underLeveled && !g.missing.length; })
    .map((c) => {
      const after = patchJob(jobs, job.id, { assigneeId: c.id });
      return { builder: c, after, peak: peakDuring(c, after, job) };
    })
    .filter((o) => o.peak <= o.builder.utilTarget + UTIL_TOLERANCE)
    .sort((a, z) => tierRank(a.builder.tier) - tierRank(z.builder.tier) || (a.peak - a.builder.utilTarget) - (z.peak - z.builder.utilTarget));
  return options[0];
}

export function recommendations(jobs: Job[], roster: Builder[]): Rec[] {
  const recs: Rec[] = [];
  const handled = new Set<string>();

  // 1. Wrong person for the work: move it to someone qualified with room.
  for (const j of active(jobs)) {
    const b = builderById(roster, j.assigneeId);
    const g = skillGaps(j, b);
    if (!g.missing.length && !g.underLeveled) continue;
    const best = bestReassignment(j, jobs, roster);
    if (!best) continue;
    const m0 = margin(j.price, jobCost(j));
    const m1 = margin(j.price, jobCost({ ...j, assigneeId: best.builder.id }));
    recs.push({
      id: `fit-${j.id}`,
      title: `Reassign "${j.title}" from ${b.name} to ${best.builder.name}`,
      detail: `Full match on ${j.skills.join(", ")}. ${best.builder.name} peaks at ${pctS(best.peak)} against a ${pctS(best.builder.utilTarget)} target. Margin ${pctS(m0)} → ${pctS(m1)}.`,
      jobId: j.id,
      patch: { assigneeId: best.builder.id },
    });
    handled.add(j.id);
  }

  // 2. Over target: shed one not-yet-started job, by reassignment or a date shift
  //    that still lands before the due date.
  for (const b of roster) {
    const load = builderLoad(b, jobs);
    if (!load.overWeeks.length) continue;
    const movable = load.jobs.filter((j) => j.status === "Scheduled" && !handled.has(j.id));

    let best: { rec: Rec; peakAfter: number } | null = null;
    for (const j of movable) {
      const r = bestReassignment(j, jobs, roster);
      if (!r) continue;
      const peakAfter = builderLoad(b, r.after).peak;
      if (peakAfter >= load.peak) continue;
      if (!best || peakAfter < best.peakAfter) {
        best = {
          peakAfter,
          rec: {
            id: `load-${j.id}`,
            title: `Move "${j.title}" from ${b.name} to ${r.builder.name}`,
            detail: `${b.name} peaks at ${pctS(load.peak)} → ${pctS(peakAfter)} (target ${pctS(b.utilTarget)}). ${r.builder.name} has the skills and stays at ${pctS(r.peak)} of a ${pctS(r.builder.utilTarget)} target.`,
            jobId: j.id,
            patch: { assigneeId: r.builder.id },
          },
        };
      }
    }

    if (!best) {
      for (const j of movable) {
        for (let d = 7; d <= 56; d += 7) {
          const patch = { start: addDays(j.start, d), end: addDays(j.end, d) };
          if (j.due && patch.end > j.due) break;
          const peakAfter = builderLoad(b, patchJob(jobs, j.id, patch)).peak;
          if (peakAfter <= b.utilTarget + UTIL_TOLERANCE) {
            best = {
              peakAfter,
              rec: {
                id: `shift-${j.id}`,
                title: `Push "${j.title}" back ${d / 7} wk${d > 7 ? "s" : ""}`,
                detail: `Starts ${fmt(patch.start)}, still finishes ${fmt(patch.end)} ahead of its ${fmt(j.due!)} due date. ${b.name} drops to ${pctS(peakAfter)} peak.`,
                jobId: j.id,
                patch,
              },
            };
            break;
          }
        }
        if (best) break;
      }
    }

    if (best) {
      recs.push(best.rec);
      handled.add(best.rec.jobId);
    }
  }
  return recs;
}

// ── Pricing & new-work staffing ─────────────────────────────────────────────

export function priceScope(scope: Scope) {
  const hours = scope.effort.reduce((s, e) => s + e.hours, 0);
  const materialsCost = scope.materials.reduce((s, m) => s + m.cost, 0);
  const specialistsPrice = scope.specialists.reduce((s, x) => s + SPECIALISTS[x.type].price, 0);
  const specialistsCost = scope.specialists.reduce((s, x) => s + SPECIALISTS[x.type].cost, 0);
  const labor = hours * TIERS[scope.requiredTier].billRate; // customer pays for the tier the work needs
  const materials = Math.round(materialsCost * (1 + MATERIALS_MARKUP));
  return { hours, labor, materials, materialsCost, specialistsPrice, specialistsCost };
}

export const durationDays = (hours: number, b: Builder) =>
  Math.max(1, Math.ceil(hours / (b.weeklyHours * CONCURRENCY_SHARE))) * 7;

export type StaffingOption = ReturnType<typeof staffingOptions>[number];

// For each capable builder, find the earliest start (in weekly steps) that keeps
// them inside their utilization target, then weigh fit, timing, load and margin.
export function staffingOptions(scope: Scope, jobs: Job[], roster: Builder[]) {
  const p = priceScope(scope);
  const need = tierRank(scope.requiredTier);
  const deadline = scope.deadlineWeeks != null ? fromToday(scope.deadlineWeeks * 7) : null;

  return roster
    .filter((b) => tierRank(b.tier) >= need)
    .map((b) => {
      const dur = durationDays(p.hours, b);
      const probe = (startDay: number, endDay: number): Job => ({
        id: "__probe", title: scope.title, customer: "", tier: scope.requiredTier, skills: scope.skills,
        assigneeId: b.id, hours: p.hours, hoursDone: 0, price: 0, materialsCost: 0, specialistsCost: 0,
        needsReview: false, status: "Scheduled", start: fromToday(startDay), end: fromToday(endDay), due: deadline,
      });
      const peakWith = (job: Job) => peakDuring(b, [...jobs, job], job);

      let plan = probe(0, dur - 1);
      for (let s = 0; s <= 56; s += 7) {
        const candidate = probe(s, s + dur - 1);
        plan = candidate;
        if (peakWith(candidate) <= b.utilTarget + UTIL_TOLERANCE) break;
        if (s === 56) plan = probe(0, dur - 1); // nothing fits: start now, flag the overload
      }
      // Can't make the deadline at a sustainable pace: compress into the deadline and charge rush.
      const rush = deadline != null && plan.end > deadline;
      if (rush) plan = probe(0, Math.max(6, dayIndex(deadline!)));

      const peak = peakWith(plan);
      const overTarget = peak > b.utilTarget + UTIL_TOLERANCE;
      const { missing } = skillGaps({ skills: scope.skills, tier: scope.requiredTier }, b);
      const skillFit = scope.skills.length ? 1 - missing.length / scope.skills.length : 1;
      const rushFee = rush ? Math.round(p.labor * RUSH_SURCHARGE) : 0;
      const price = p.labor + p.materials + p.specialistsPrice + rushFee;
      const cost = p.hours * TIERS[b.tier].costRate + p.materialsCost + p.specialistsCost;
      const m = margin(price, cost);
      const overLeveled = tierRank(b.tier) > need;
      const waitWeeks = dayIndex(plan.start) / 7;

      const score =
        skillFit * 50 - (overTarget ? 20 : 0) - (peak > 1 ? 20 : 0) - (rush ? 8 : 0) - waitWeeks * 2 -
        (overLeveled ? 15 : 0) + m * 30 + (b.utilTarget - peak) * 10;

      return {
        builder: b, start: plan.start, end: plan.end, peak, overTarget, missing, skillFit,
        rush, rushFee, price, cost, margin: m, overLeveled, score,
      };
    })
    .sort((a, z) => z.score - a.score);
}

export function whyRecommended(o: StaffingOption, scope: Scope) {
  const bits = [
    o.missing.length ? `${scope.skills.length - o.missing.length}/${scope.skills.length} skills` : "full skill match",
    o.overLeveled ? "over-leveled" : "right tier",
    `peaks at ${pctS(o.peak)} vs ${pctS(o.builder.utilTarget)} target`,
    dayIndex(o.start) > 0 ? `starts ${fmt(o.start)}` : "can start now",
  ];
  return bits.join(" · ");
}

// ── Team rollup ─────────────────────────────────────────────────────────────

export function teamStats(jobs: Job[], roster: Builder[]) {
  const open = active(jobs);
  const hrs = (b: Builder) => b.weeklyHours * PLANNING_WEEKS;
  const total = roster.reduce((s, b) => s + hrs(b), 0);
  const revenue = open.reduce((s, j) => s + j.price, 0);
  const cost = open.reduce((s, j) => s + jobCost(j), 0);
  const f = flags(jobs, roster);
  return {
    activeJobs: open.length,
    utilization: roster.reduce((s, b) => s + builderLoad(b, jobs).util * hrs(b), 0) / total,
    target: roster.reduce((s, b) => s + b.utilTarget * hrs(b), 0) / total,
    booked: revenue,
    margin: margin(revenue, cost),
    flags: f.filter((x) => x.kind !== "late").length,
    late: f.filter((x) => x.kind === "late").length,
  };
}
