// Single source of truth for the delivery model. The system prompt and the
// server-side pricing/margin math both read from here, so the rate card
// can't drift between what the model is told and what the code enforces.

export const TIERS = {
  "Junior Builder": {
    services: "Resident Architect / associate",
    base: 1200,
    leadWeeks: [3, 4],
    loadedCost: 0.55, // share of base price that goes to labor + materials
  },
  "Senior Builder": {
    services: "Senior consultant",
    base: 2800,
    leadWeeks: [6, 8],
    loadedCost: 0.6,
  },
  "Master Builder": {
    services: "Principal architect",
    base: 5500,
    leadWeeks: [10, 14],
    loadedCost: 0.65,
  },
} as const;

export type TierName = keyof typeof TIERS;

export const SPECIALIST_COST_SHARE = 0.7; // specialists are subcontracted, thinner margin
export const RUSH_SURCHARGE = 0.25;
