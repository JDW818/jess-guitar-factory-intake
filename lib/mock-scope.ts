import type { Scope } from "./scope-schema";

// Canned response for local UI work without Gateway credentials (SCOPING_MOCK=1).
export const MOCK_SCOPE: Scope = {
  title: "LH semi-hollow, flame maple top",
  customer: "Blue Line Jazz Trio",
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
