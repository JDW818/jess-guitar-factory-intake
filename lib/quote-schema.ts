import { z } from "zod";

export const quoteSchema = z.object({
  spec: z.object({
    bodyStyle: z.string(),
    handedness: z.enum(["right", "left"]),
    tonewood: z.string(),
    finish: z.string(),
    pickups: z.string(),
    scaleLength: z.string().nullable(),
    otherRequests: z.array(z.string()),
  }),
  complexity: z.enum(["standard", "custom", "bespoke"]),
  builder: z.object({
    tier: z.enum(["Junior Builder", "Senior Builder", "Master Builder"]),
    rationale: z.string().describe("Why this tier: the scoping logic, made visible"),
  }),
  fullRig: z.array(
    z.object({
      specialist: z.string(),
      reason: z.string(),
      addOnPrice: z.number(),
    }),
  ),
  pricing: z.object({
    baseBuild: z.number(),
    addOns: z.number().describe("Build upgrades beyond the tier base (premium woods, inlays, hardware)"),
    rushRequested: z.boolean().describe("True if the customer's deadline is shorter than the natural lead time"),
  }),
  leadTimeWeeks: z.number(),
  risks: z.array(z.string()),
  needsHumanReview: z.boolean(),
  quoteSummary: z.string().describe("Customer-facing paragraph"),
});

export type Quote = z.infer<typeof quoteSchema>;
