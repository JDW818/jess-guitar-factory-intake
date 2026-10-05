import type { Scope } from "./scope-schema";

// Canned responses for local UI work without Gateway credentials (SCOPING_MOCK=1),
// one per engagement shape, picked by keywords in the request.

const JAZZ: Scope = {
  title: "LH semi-hollow, flame maple top",
  customer: "Blue Line Jazz Trio",
  engagement: "one-off",
  engagementRationale: "A single custom instrument for one player.",
  quantity: 1,
  fulfillment: "made to order",
  tourTechWeeks: null,
  spec: {
    bodyStyle: "Semi-hollow (335-style)",
    handedness: "left",
    tonewood: "Flame maple top, mahogany center block",
    finish: "Amber burst, gloss nitro",
    pickups: "Vintage-output humbuckers",
    otherRequests: ["Mid-tier budget"],
  },
  complexity: "custom",
  requiredTier: "Senior",
  tierRationale:
    "Left-handed semi-hollow with a figured top and custom burst: beyond catalog work, but no carving, inlay or exotic wood, so it doesn't need a Master.",
  skills: ["left-handed", "hollow/semi-hollow", "custom finish"],
  effort: [
    { phase: "design", hours: 6 },
    { phase: "woodwork", hours: 34 },
    { phase: "finish", hours: 18 },
    { phase: "electronics", hours: 8 },
    { phase: "setup", hours: 4 },
  ],
  materials: [
    { item: "Flame maple top (AA)", cost: 520 },
    { item: "Mahogany back/sides + center block", cost: 280 },
    { item: "Humbucker set + LH hardware", cost: 390 },
  ],
  specialists: [
    { type: "amp", reason: "Jazz trio use case: a warm tube amp matched to the humbuckers completes the rig." },
    { type: "setup", reason: "Gigging player; a pro setup after the build settles." },
  ],
  deadlineWeeks: 6,
  risks: [
    "Six-week deadline is tight for a custom semi-hollow with nitro finish cure time.",
    "Assumed 'mid-tier budget' means under $12k all-in.",
  ],
  needsReview: true,
};

const TOUR: Scope = {
  title: "Baritone 7, Brazilian rosewood, abalone inlays",
  customer: "Grimhold",
  engagement: "build+tech",
  engagementRationale: "A custom build plus a tech on the road for the six-week tour.",
  quantity: 1,
  fulfillment: "fully custom",
  tourTechWeeks: 6,
  spec: {
    bodyStyle: "Solid-body baritone 7-string",
    handedness: "right",
    tonewood: "Alder body, maple neck, Brazilian rosewood board",
    finish: "Satin black",
    pickups: "Active 7-string humbuckers",
    otherRequests: ["Abalone position inlays"],
  },
  complexity: "bespoke",
  requiredTier: "Master",
  tierRationale: "Brazilian rosewood and abalone inlay work need a Master; the baritone 7-string alone would be Senior work.",
  skills: ["extended range", "exotic tonewoods", "inlay"],
  effort: [
    { phase: "design", hours: 12 },
    { phase: "woodwork", hours: 65 },
    { phase: "finish", hours: 22 },
    { phase: "electronics", hours: 10 },
    { phase: "setup", hours: 9 },
  ],
  materials: [
    { item: "Documented Brazilian rosewood board", cost: 800 },
    { item: "Alder body + maple neck blanks", cost: 300 },
    { item: "Active 7-string pickups + hardware", cost: 600 },
  ],
  specialists: [
    { type: "pickups", reason: "High-gain metal: pickups voiced for drop tunings." },
    { type: "pedals", reason: "Touring metal rig: a board built around the new guitar." },
  ],
  deadlineWeeks: 5,
  risks: [
    "Five weeks is aggressive for ~118 bench hours plus finish cure.",
    "Brazilian rosewood needs documented provenance, and CITES paperwork if the tour crosses borders.",
  ],
  needsReview: true,
};

const DISTRICT: Scope = {
  title: "40 student Strat-style guitars",
  customer: "Austin ISD Music Program",
  engagement: "rollout",
  engagementRationale: "Forty identical instruments for one program, delivered together.",
  quantity: 40,
  fulfillment: "modified stock",
  tourTechWeeks: null,
  spec: {
    bodyStyle: "Strat-style solid-body",
    handedness: "right",
    tonewood: "Alder body, maple neck",
    finish: "Maroon solid color, white pickguard",
    pickups: "Stock SSS single-coils",
    otherRequests: ["District crest engraved on neck plate", "Set up and ready to play"],
  },
  complexity: "standard",
  requiredTier: "Junior",
  tierRationale: "Stock guitars with a solid-color refinish and an engraved plate: repeatable work, no custom construction.",
  skills: [],
  effort: [
    { phase: "finish", hours: 4.5 },
    { phase: "setup", hours: 2.5 },
  ],
  materials: [
    { item: "Stock Strat-style guitar", cost: 320 },
    { item: "Refinish supplies, white pickguard, engraved neck plate", cost: 45 },
  ],
  specialists: [],
  deadlineWeeks: 6,
  risks: [
    "Forty units: confirm stock depth with the distributor before committing.",
    "School procurement may require a PO and net-60 terms.",
  ],
  needsReview: false,
};

export function mockScope(request: string): Scope {
  const r = request.toLowerCase();
  if (/\b(district|isd|school|program|fleet)\b|\b\d{2,}\s+(student\s+)?guitars\b/.test(r)) return DISTRICT;
  if (/\btour\b|\bon the road\b/.test(r)) return TOUR;
  return JAZZ;
}
