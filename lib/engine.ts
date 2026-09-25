// Deterministic pricing, capacity and staffing. The model scopes; this decides.
import { dayIndex, fmt, fromToday } from "./dates";
import type { Scope } from "./scope-schema";
import {
  CONCURRENCY_SHARE, MATERIALS_MARKUP, PLANNING_WEEKS, ROSTER, RUSH_SURCHARGE, SPECIALISTS, TIER_ORDER, TIERS,
  UTIL_TOLERANCE,
  type Builder, type Job, type Tier,
} from "./shop";

const tierRank = (t: Tier) => TIER_ORDER.indexOf(t);
const active = (jobs: Job[]) => jobs.filter((j) => j.status !== "Delivered");
const max = (xs: number[]) => xs.reduce((m, x) => Math.max(m, x), 0);
const pctS = (n: number) => `${Math.round(n * 100)}%`;

function remainingHours(job: Job) {
  return job.status === "Delivered" ? 0 : Math.max(0, job.hours - job.hoursDone);
}

function jobCost(job: Job) {
  const b = ROSTER.find((r) => r.id === job.assigneeId)!;
  return job.hours * TIERS[b.tier].costRate + job.materialsCost + job.specialistsCost;
}

const margin = (price: number, cost: number) => (price > 0 ? (price - cost) / price : 0);

// ── Capacity ────────────────────────────────────────────────────────────────

// A job's remaining hours spread evenly over the days left in its window,
// bucketed into weeks from today.
function jobWeeklyHours(job: Job): number[] {
  const out = Array<number>(PLANNING_WEEKS).fill(0);
  const rem = remainingHours(job);
  if (!rem) return out;
  const from = Math.max(0, dayIndex(job.start));
  const to = Math.max(from, dayIndex(job.end));
  const perDay = rem / (to - from + 1);
  for (let w = 0; w < PLANNING_WEEKS; w++) {
    const overlap = Math.min(w * 7 + 6, to) - Math.max(w * 7, from) + 1;
    if (overlap > 0) out[w] = overlap * perDay;
  }
  return out;
}

function weeklyUtil(b: Builder, jobs: Job[]) {
  const hours = Array<number>(PLANNING_WEEKS).fill(0);
  for (const j of active(jobs)) if (j.assigneeId === b.id) jobWeeklyHours(j).forEach((h, w) => (hours[w] += h));
  return hours.map((h) => h / b.weeklyHours);
}

export type UtilLevel = "overloaded" | "over" | "on" | "bench";
export function utilLevel(util: number, target: number): UtilLevel {
  if (util > 1) return "overloaded";
  if (util > target + UTIL_TOLERANCE) return "over";
  if (util < target - 0.15) return "bench";
  return "on";
}

// Utilization over the planning horizon: average and peak week, vs target.
export function builderLoad(b: Builder, jobs: Job[]) {
  const weeks = weeklyUtil(b, jobs);
  return {
    jobs: active(jobs).filter((j) => j.assigneeId === b.id),
    util: weeks.reduce((s, u) => s + u, 0) / PLANNING_WEEKS,
    peak: max(weeks),
  };
}

export function teamStats(jobs: Job[]) {
  const open = active(jobs);
  const hrs = (b: Builder) => b.weeklyHours;
  const total = ROSTER.reduce((s, b) => s + hrs(b), 0);
  const revenue = open.reduce((s, j) => s + j.price, 0);
  return {
    utilization: ROSTER.reduce((s, b) => s + builderLoad(b, jobs).util * hrs(b), 0) / total,
    target: ROSTER.reduce((s, b) => s + b.utilTarget * hrs(b), 0) / total,
    booked: revenue,
    margin: margin(revenue, open.reduce((s, j) => s + jobCost(j), 0)),
  };
}

// ── Pricing & staffing ──────────────────────────────────────────────────────

export function priceScope(scope: Scope) {
  const hours = scope.effort.reduce((s, e) => s + e.hours, 0);
  const materialsCost = scope.materials.reduce((s, m) => s + m.cost, 0);
  const specialistsPrice = scope.specialists.reduce((s, x) => s + SPECIALISTS[x.type].price, 0);
  const specialistsCost = scope.specialists.reduce((s, x) => s + SPECIALISTS[x.type].cost, 0);
  const labor = hours * TIERS[scope.requiredTier].billRate; // customer pays for the tier the work needs
  const materials = Math.round(materialsCost * (1 + MATERIALS_MARKUP));
  return { hours, labor, materials, materialsCost, specialistsPrice, specialistsCost };
}

export type StaffingOption = ReturnType<typeof staffingOptions>[number];

// For each builder at or above the required tier: find the earliest start
// (in weekly steps) that keeps them within their utilization target, then
// weigh skill fit, timing, load and margin.
export function staffingOptions(scope: Scope, jobs: Job[]) {
  const p = priceScope(scope);
  const need = tierRank(scope.requiredTier);
  const deadline = scope.deadlineWeeks != null ? fromToday(scope.deadlineWeeks * 7) : null;

  return ROSTER.filter((b) => tierRank(b.tier) >= need)
    .map((b) => {
      const dur = Math.max(1, Math.ceil(p.hours / (b.weeklyHours * CONCURRENCY_SHARE))) * 7;
      const probe = (startDay: number, endDay: number): Job => ({
        id: "__probe", title: scope.title, customer: "", tier: scope.requiredTier, skills: scope.skills,
        assigneeId: b.id, hours: p.hours, hoursDone: 0, price: 0, materialsCost: 0, specialistsCost: 0,
        needsReview: false, status: "Scheduled", start: fromToday(startDay), end: fromToday(endDay), due: deadline,
      });
      const peakWith = (job: Job) => builderLoad(b, [...jobs, job]).peak;

      let plan = probe(0, dur - 1);
      for (let s = 7; s <= 56 && peakWith(plan) > b.utilTarget + UTIL_TOLERANCE; s += 7) plan = probe(s, s + dur - 1);
      if (peakWith(plan) > b.utilTarget + UTIL_TOLERANCE) plan = probe(0, dur - 1); // nothing fits: start now, show the overload

      // Can't make the deadline at a sustainable pace: compress into it and charge rush.
      const rush = deadline != null && plan.end > deadline;
      if (rush) plan = probe(0, Math.max(6, dayIndex(deadline!)));

      const peak = peakWith(plan);
      const overTarget = peak > b.utilTarget + UTIL_TOLERANCE;
      const missing = scope.skills.filter((s) => !b.skills.includes(s));
      const skillFit = scope.skills.length ? 1 - missing.length / scope.skills.length : 1;
      const rushFee = rush ? Math.round(p.labor * RUSH_SURCHARGE) : 0;
      const price = p.labor + p.materials + p.specialistsPrice + rushFee;
      const cost = p.hours * TIERS[b.tier].costRate + p.materialsCost + p.specialistsCost;
      const m = margin(price, cost);
      const overLeveled = tierRank(b.tier) > need;
      const waitWeeks = dayIndex(plan.start) / 7;

      const score =
        skillFit * 100 - (overTarget ? 20 : 0) - (peak > 1 ? 20 : 0) - (rush ? 8 : 0) - waitWeeks * 2 -
        (overLeveled ? 15 : 0) + m * 30 + (b.utilTarget - peak) * 10;

      return { builder: b, start: plan.start, end: plan.end, peak, overTarget, missing, rush, rushFee, price, margin: m, overLeveled, score };
    })
    .sort((a, z) => z.score - a.score);
}

export function whyRecommended(o: StaffingOption, scope: Scope) {
  return [
    o.missing.length ? `${scope.skills.length - o.missing.length}/${scope.skills.length} skills` : "full skill match",
    o.overLeveled ? "over-leveled" : "right tier",
    `peaks at ${pctS(o.peak)} of a ${pctS(o.builder.utilTarget)} target`,
    dayIndex(o.start) > 0 ? `starts ${fmt(o.start)}` : "can start now",
  ].join(" · ");
}
