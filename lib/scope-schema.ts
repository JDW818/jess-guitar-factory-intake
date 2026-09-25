import { z } from "zod";
import { PHASES, SKILLS, SPECIALIST_KEYS, TIER_ORDER } from "./shop";

export const scopeSchema = z.object({
  title: z.string().describe("Short internal job name, e.g. 'LH semi-hollow, flame maple'"),
  customer: z.string().nullable().describe("Customer name if given"),
  spec: z.object({
    bodyStyle: z.string(),
    handedness: z.enum(["right", "left"]),
    tonewood: z.string(),
    finish: z.string(),
    pickups: z.string(),
    otherRequests: z.array(z.string()),
  }),
  complexity: z.enum(["standard", "custom", "bespoke"]),
  requiredTier: z.enum(TIER_ORDER),
  tierRationale: z.string().describe("Why this tier: the scoping logic, made visible"),
  skills: z.array(z.enum(SKILLS)).describe("Skills the assigned builder needs"),
  effort: z.array(z.object({ phase: z.enum(PHASES), hours: z.number() })),
  materials: z.array(z.object({ item: z.string(), cost: z.number() })).describe("Shop cost of materials"),
  specialists: z.array(z.object({ type: z.enum(SPECIALIST_KEYS), reason: z.string() })),
  deadlineWeeks: z.number().nullable().describe("Requested turnaround in weeks from today, null if none given"),
  risks: z.array(z.string()),
  needsReview: z.boolean(),
});

export type Scope = z.infer<typeof scopeSchema>;
