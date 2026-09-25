// The shop's operating model: rate card, roster, specialists, seed workload.
// Everything deterministic (pricing, staffing, margin) reads from here.

import { fromToday } from "./dates";

export const TIER_ORDER = ["Junior", "Senior", "Master"] as const;
export type Tier = (typeof TIER_ORDER)[number];

export const TIERS: Record<Tier, { label: string; services: string; billRate: number; costRate: number }> = {
  Junior: { label: "Junior Builder", services: "Associate", billRate: 90, costRate: 45 },
  Senior: { label: "Senior Builder", services: "Senior Consultant", billRate: 140, costRate: 70 },
  Master: { label: "Master Builder", services: "Principal Architect", billRate: 210, costRate: 110 },
};

export const SKILLS = [
  "solid-body",
  "hollow/semi-hollow",
  "archtop carving",
  "extended range",
  "left-handed",
  "exotic tonewoods",
  "inlay",
  "custom finish",
  "vintage recreation",
  "electronics",
  "setup",
] as const;
export type Skill = (typeof SKILLS)[number];

export const PHASES = ["design", "woodwork", "finish", "electronics", "setup"] as const;

export const SPECIALIST_KEYS = ["amp", "pedals", "pickups", "setup", "finish"] as const;
export type SpecialistKey = (typeof SPECIALIST_KEYS)[number];
export const SPECIALISTS: Record<SpecialistKey, { label: string; price: number; cost: number }> = {
  amp: { label: "Amp specialist", price: 650, cost: 450 },
  pedals: { label: "Pedal / effects specialist", price: 500, cost: 340 },
  pickups: { label: "Pickup winder", price: 450, cost: 300 },
  setup: { label: "Setup / fret tech", price: 300, cost: 180 },
  finish: { label: "Finish artist", price: 900, cost: 600 },
};

export const MATERIALS_MARKUP = 0.3;
export const RUSH_SURCHARGE = 0.25;
export const PLANNING_WEEKS = 4; // near-term utilization horizon
export const UTIL_TOLERANCE = 0.05; // slack over target before we call it over
export const CONCURRENCY_SHARE = 0.5; // new jobs are planned at ~half a builder's week, so work can overlap

// utilTarget: share of weekly hours that should be billable build work.
// Masters run lower: they carry design reviews, mentoring and QA sign-off.
export type Builder = { id: string; name: string; tier: Tier; skills: Skill[]; weeklyHours: number; utilTarget: number };

export const DEFAULT_TARGETS: Record<Tier, number> = { Junior: 0.85, Senior: 0.8, Master: 0.7 };

export const ROSTER: Builder[] = [
  { id: "maya", name: "Maya Okafor", tier: "Master", skills: ["archtop carving", "hollow/semi-hollow", "inlay", "vintage recreation", "exotic tonewoods"], weeklyHours: 40, utilTarget: DEFAULT_TARGETS.Master },
  { id: "dev", name: "Dev Ramanathan", tier: "Master", skills: ["exotic tonewoods", "extended range", "custom finish", "inlay", "hollow/semi-hollow"], weeklyHours: 40, utilTarget: DEFAULT_TARGETS.Master },
  { id: "priya", name: "Priya Shah", tier: "Senior", skills: ["left-handed", "hollow/semi-hollow", "custom finish", "electronics"], weeklyHours: 40, utilTarget: DEFAULT_TARGETS.Senior },
  { id: "tomas", name: "Tomás Reyes", tier: "Senior", skills: ["extended range", "solid-body", "electronics", "left-handed"], weeklyHours: 40, utilTarget: DEFAULT_TARGETS.Senior },
  { id: "sam", name: "Sam Lee", tier: "Junior", skills: ["solid-body", "setup"], weeklyHours: 40, utilTarget: DEFAULT_TARGETS.Junior },
  { id: "jo", name: "Jo Martin", tier: "Junior", skills: ["solid-body", "electronics", "setup"], weeklyHours: 32, utilTarget: DEFAULT_TARGETS.Junior },
];

export const JOB_STATUSES = ["Scheduled", "In build", "Setup & QA", "Delivered"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type Job = {
  id: string;
  title: string;
  customer: string;
  tier: Tier; // tier the work requires; drives the price
  skills: Skill[]; // skills the work requires
  assigneeId: string; // who does it; drives the cost
  hours: number;
  hoursDone: number;
  price: number;
  materialsCost: number;
  specialistsCost: number;
  needsReview: boolean;
  status: JobStatus;
  start: string; // planned start (YYYY-MM-DD)
  end: string; // planned finish, inclusive
  due: string | null; // committed delivery date
};

// Seed workload is built relative to today so the demo always looks current.
// Maya is overbooked and the Juniors have room, so staffing calls have teeth.
export function seedJobs(): Job[] {
  const job = (
    id: string, title: string, customer: string, tier: Tier, skills: Skill[], assigneeId: string,
    hours: number, hoursDone: number, materials: number, status: JobStatus,
    [start, end, due]: [number, number, number],
  ): Job => ({
    id, title, customer, tier, skills, assigneeId, hours, hoursDone, status,
    price: Math.round(hours * TIERS[tier].billRate + materials * (1 + MATERIALS_MARKUP)),
    materialsCost: materials,
    specialistsCost: 0,
    needsReview: false,
    start: fromToday(start),
    end: fromToday(end),
    due: fromToday(due),
  });

  return [
    job("j1", "1950s L-5 archtop recreation", "R. Castillo", "Master", ["archtop carving", "vintage recreation"], "maya", 160, 40, 1800, "In build", [-21, 35, 28]),
    job("j2", "Quilted maple jazz box, block inlays", "Blue Note Trio", "Master", ["hollow/semi-hollow", "inlay", "exotic tonewoods"], "maya", 130, 0, 1400, "Scheduled", [14, 63, 77]),
    job("j3", "Koa 7-string, bespoke body", "N. Farah", "Master", ["exotic tonewoods", "extended range"], "dev", 110, 70, 1600, "In build", [-35, 10, 14]),
    job("j4", "LH semi-hollow, custom burst", "A. Kim", "Senior", ["left-handed", "hollow/semi-hollow", "custom finish"], "priya", 80, 20, 700, "In build", [-14, 21, 28]),
    job("j5", "LH Tele w/ Bigsby", "Harbor Church", "Senior", ["left-handed", "electronics"], "priya", 60, 0, 500, "Scheduled", [7, 42, 49]),
    job("j10", "Baritone 7, fanned frets", "Grimhold", "Senior", ["extended range"], "tomas", 70, 0, 650, "Scheduled", [0, 35, 42]),
    job("j6", "Baritone 6, EMG swap", "Grimhold", "Senior", ["extended range", "electronics"], "tomas", 55, 45, 450, "Setup & QA", [-28, 5, 7]),
    job("j7", "Strat-style, sunburst", "Austin Music Academy", "Junior", ["solid-body"], "sam", 35, 10, 300, "In build", [-7, 10, 14]),
    job("j8", "Strat-style, olympic white", "Austin Music Academy", "Junior", ["solid-body"], "sam", 35, 0, 300, "Scheduled", [10, 28, 35]),
    job("j9", "Tele kit assembly", "D. Wu", "Junior", ["solid-body", "setup"], "jo", 25, 20, 250, "Setup & QA", [-21, 3, 5]),
  ];
}
