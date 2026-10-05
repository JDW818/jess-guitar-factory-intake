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
  title: "'57 single-cut Junior recreation, TV yellow",
  customer: "Saves the Day",
  engagement: "build+tech",
  engagementRationale: "A vintage recreation plus a tech on the road for the six-week tour.",
  quantity: 1,
  fulfillment: "made to order",
  tourTechWeeks: 6,
  spec: {
    bodyStyle: "Single-cut slab body, '57 Junior-style",
    handedness: "right",
    tonewood: "One-piece mahogany body and neck, rosewood board",
    finish: "TV yellow, thin nitro",
    pickups: "Single dog-ear P-90",
    otherRequests: ["Wraparound bridge", "Voiced to pair with Fender Twin and Matchless DC-30 amps"],
  },
  complexity: "bespoke",
  requiredTier: "Master",
  tierRationale: "A period-correct vintage recreation (neck carve, thin nitro, P-90 voicing) is Master work; a modern single-cut would be Senior.",
  skills: ["vintage recreation"],
  effort: [
    { phase: "design", hours: 8 },
    { phase: "woodwork", hours: 55 },
    { phase: "finish", hours: 30 },
    { phase: "electronics", hours: 4 },
    { phase: "setup", hours: 6 },
  ],
  materials: [
    { item: "One-piece mahogany body + neck blanks", cost: 450 },
    { item: "Rosewood fingerboard", cost: 80 },
    { item: "P-90, wraparound bridge, vintage tuners", cost: 260 },
    { item: "TV yellow nitro finish supplies", cost: 70 },
  ],
  specialists: [
    { type: "amp", reason: "Dial the P-90 in against their Fender Twins and Matchless DC-30s before the tour." },
    { type: "setup", reason: "Touring band: a pro setup once the nitro has settled." },
  ],
  deadlineWeeks: 5,
  risks: [
    "Five weeks is tight for a thin nitro finish to cure before heavy touring.",
    "Period-correct one-piece mahogany needs sourcing now; a two-piece blank would shift the build.",
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
