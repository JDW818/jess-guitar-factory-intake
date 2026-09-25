import { generateText, Output } from "ai";
import { quoteSchema } from "@/lib/quote-schema";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { RUSH_SURCHARGE, SPECIALIST_COST_SHARE, TIERS } from "@/lib/tiers";

export const maxDuration = 60;

// Routed through Vercel AI Gateway: a plain "provider/model" string uses the
// Gateway provider. Auth is AI_GATEWAY_API_KEY locally, OIDC on Vercel.
const MODEL = process.env.QUOTE_MODEL ?? "openai/gpt-6-astra";

export async function POST(request: Request) {
  const { request: text } = await request.json();
  if (typeof text !== "string" || text.trim().length < 5) {
    return Response.json({ error: "Tell us a bit about the build." }, { status: 400 });
  }

  try {
    const { output: quote } = await generateText({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      prompt: text.slice(0, 2000),
      output: Output.object({ schema: quoteSchema }),
    });

    // The model scopes; code does the math. Totals and margin are
    // deterministic so the quote can't hallucinate a number.
    const tier = TIERS[quote.builder.tier];
    const baseBuild = tier.base;
    const specialists = quote.fullRig.reduce((sum, s) => sum + s.addOnPrice, 0);
    const buildSubtotal = baseBuild + quote.pricing.addOns;
    const rushSurcharge = quote.pricing.rushRequested ? Math.round(buildSubtotal * RUSH_SURCHARGE) : 0;
    const total = buildSubtotal + specialists + rushSurcharge;

    const cost = buildSubtotal * tier.loadedCost + specialists * SPECIALIST_COST_SHARE;
    const marginPct = Math.round(((total - cost) / total) * 100);

    return Response.json({
      ...quote,
      pricing: { ...quote.pricing, baseBuild, specialists, rushSurcharge, total },
      economics: { servicesTier: tier.services, marginPct },
      model: MODEL,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "The shop floor is jammed. Try again in a moment." }, { status: 500 });
  }
}
