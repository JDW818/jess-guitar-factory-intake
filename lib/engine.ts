// Deterministic pricing + staffing. The model scopes; this decides.
import type { Scope } from "./scope-schema";
import {
  BUILD_ALLOCATION, MATERIALS_MARKUP, ROSTER, RUSH_SURCHARGE, SPECIALISTS, TIER_ORDER, TIERS,
  type Builder, type Job,
} from "./shop";

export const tierRank = (t: keyof typeof TIERS) => TIER_ORDER.indexOf(t);

export function remainingHours(job: Job) {
  return job.status === "Delivered" ? 0 : Math.max(0, job.hours - job.hoursDone);
}

export function jobCost(job: Job) {
  const b = ROSTER.find((r) => r.id === job.assigneeId)!;
  return job.hours * TIERS[b.tier].costRate + job.materialsCost + job.specialistsCost;
}

export const margin = (price: number, cost: number) => (price > 0 ? (price - cost) / price : 0);

export function builderLoad(b: Builder, jobs: Job[]) {
  const mine = jobs.filter((j) => j.assigneeId === b.id && j.status !== "Delivered");
  const remaining = mine.reduce((s, j) => s + remainingHours(j), 0);
  const weekly = b.weeklyHours * BUILD_ALLOCATION;
  return {
    jobs: mine,
    remaining,
    backlogWeeks: remaining / weekly,
    load4wk: remaining / (weekly * 4), // >1 means booked past the 4-week horizon
  };
}

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

export function staffingOptions(scope: Scope, jobs: Job[]) {
  const p = priceScope(scope);
  const need = tierRank(scope.requiredTier);

  return ROSTER.filter((b) => tierRank(b.tier) >= need)
    .map((b) => {
      const load = builderLoad(b, jobs);
      const matched = scope.skills.filter((s) => b.skills.includes(s));
      const skillFit = scope.skills.length ? matched.length / scope.skills.length : 1;
      const buildWeeks = p.hours / (b.weeklyHours * BUILD_ALLOCATION);
      const deliverWeeks = Math.ceil(load.backlogWeeks + buildWeeks);
      const rush = scope.deadlineWeeks != null && deliverWeeks > scope.deadlineWeeks;
      const subtotal = p.labor + p.materials + p.specialistsPrice;
      const rushFee = rush ? Math.round(p.labor * RUSH_SURCHARGE) : 0;
      const price = subtotal + rushFee;
      const cost = p.hours * TIERS[b.tier].costRate + p.materialsCost + p.specialistsCost;
      const m = margin(price, cost);
      const overLeveled = tierRank(b.tier) > need;

      const score = skillFit * 50 + (rush ? 0 : 25) - load.backlogWeeks * 3 - (overLeveled ? 15 : 0) + m * 30;

      return {
        builder: b, load, matched, skillFit, buildWeeks, deliverWeeks,
        rush, rushFee, price, cost, margin: m, overLeveled, score,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function teamStats(jobs: Job[]) {
  const active = jobs.filter((j) => j.status !== "Delivered");
  const capacity4wk = ROSTER.reduce((s, b) => s + b.weeklyHours * BUILD_ALLOCATION * 4, 0);
  const remaining = active.reduce((s, j) => s + remainingHours(j), 0);
  const booked = active.reduce((s, j) => s + j.price, 0);
  const cost = active.reduce((s, j) => s + jobCost(j), 0);
  return {
    activeJobs: active.length,
    remaining,
    utilization: Math.min(remaining, capacity4wk) / capacity4wk,
    booked,
    margin: margin(booked, cost),
    reviews: active.filter((j) => j.needsReview).length,
  };
}
