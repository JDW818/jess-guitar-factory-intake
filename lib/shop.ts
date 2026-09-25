// The shop's operating model: rate card, roster, specialists, seed workload.
// Everything deterministic (pricing, staffing, margin) reads from here.

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
export const BUILD_ALLOCATION = 0.8; // share of a builder's week that goes to build work

export type Builder = { id: string; name: string; tier: Tier; skills: Skill[]; weeklyHours: number };

export const ROSTER: Builder[] = [
  { id: "maya", name: "Maya Okafor", tier: "Master", skills: ["archtop carving", "hollow/semi-hollow", "inlay", "vintage recreation", "exotic tonewoods"], weeklyHours: 40 },
  { id: "dev", name: "Dev Ramanathan", tier: "Master", skills: ["exotic tonewoods", "extended range", "custom finish", "solid-body", "inlay"], weeklyHours: 40 },
  { id: "priya", name: "Priya Shah", tier: "Senior", skills: ["left-handed", "hollow/semi-hollow", "custom finish", "electronics"], weeklyHours: 40 },
  { id: "tomas", name: "Tomás Reyes", tier: "Senior", skills: ["extended range", "solid-body", "electronics", "left-handed"], weeklyHours: 40 },
  { id: "sam", name: "Sam Lee", tier: "Junior", skills: ["solid-body", "setup"], weeklyHours: 40 },
  { id: "jo", name: "Jo Martin", tier: "Junior", skills: ["solid-body", "electronics", "setup"], weeklyHours: 32 },
];

export const JOB_STATUSES = ["Scheduled", "In build", "Setup & QA", "Delivered"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export type Job = {
  id: string;
  title: string;
  customer: string;
  tier: Tier; // tier the work requires; drives the price
  assigneeId: string; // who does it; drives the cost
  hours: number;
  hoursDone: number;
  price: number;
  materialsCost: number;
  specialistsCost: number;
  needsReview: boolean;
  status: JobStatus;
};

function seed(id: string, title: string, customer: string, tier: Tier, assigneeId: string, hours: number, hoursDone: number, materials: number, status: JobStatus): Job {
  return {
    id, title, customer, tier, assigneeId, hours, hoursDone, status,
    price: Math.round(hours * TIERS[tier].billRate + materials * (1 + MATERIALS_MARKUP)),
    materialsCost: materials,
    specialistsCost: 0,
    needsReview: false,
  };
}

export const SEED_JOBS: Job[] = [
  seed("j1", "1950s L-5 archtop recreation", "R. Castillo", "Master", "maya", 160, 40, 1800, "In build"),
  seed("j2", "Quilted maple jazz box w/ block inlays", "Blue Note Trio", "Master", "maya", 120, 0, 1400, "Scheduled"),
  seed("j3", "Koa 7-string, bespoke body", "N. Farah", "Master", "dev", 110, 70, 1600, "In build"),
  seed("j4", "LH semi-hollow, custom burst", "A. Kim", "Senior", "priya", 80, 20, 700, "In build"),
  seed("j5", "LH Tele w/ Bigsby", "Harbor Church", "Senior", "priya", 60, 0, 500, "Scheduled"),
  seed("j6", "Baritone 6, EMG swap", "Grimhold", "Senior", "tomas", 55, 45, 450, "Setup & QA"),
  seed("j7", "Strat-style, sunburst", "Austin Music Academy", "Junior", "sam", 35, 10, 300, "In build"),
  seed("j8", "Strat-style, olympic white", "Austin Music Academy", "Junior", "sam", 35, 0, 300, "Scheduled"),
  seed("j9", "Tele kit assembly", "D. Wu", "Junior", "jo", 25, 20, 250, "Setup & QA"),
];
