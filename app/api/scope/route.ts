import { generateText, Output } from "ai";
import { MOCK_SCOPE } from "@/lib/mock-scope";
import { scopeSchema } from "@/lib/scope-schema";
import { systemPrompt } from "@/lib/system-prompt";

export const maxDuration = 60;

// Routed through Vercel AI Gateway: a plain "provider/model" string uses the
// Gateway provider. Auth is AI_GATEWAY_API_KEY locally, OIDC on Vercel.
const MODEL = process.env.SCOPING_MODEL ?? "openai/gpt-6-astra";

export async function POST(request: Request) {
  const { request: text } = await request.json();
  if (typeof text !== "string" || text.trim().length < 5) {
    return Response.json({ error: "Paste in the customer's request." }, { status: 400 });
  }

  if (process.env.SCOPING_MOCK === "1") {
    return Response.json({ scope: MOCK_SCOPE, model: "mock" });
  }

  try {
    const { output: scope } = await generateText({
      model: MODEL,
      instructions: systemPrompt(new Date().toDateString()),
      prompt: text.slice(0, 4000),
      output: Output.object({ schema: scopeSchema }),
    });
    return Response.json({ scope, model: MODEL });
  } catch (err) {
    console.error(err);
    // Surface the provider's reason (e.g. auth, credits, unknown model) so failures are diagnosable.
    const detail = err instanceof Error ? `${err.name}: ${err.message}`.slice(0, 300) : undefined;
    return Response.json({ error: "Scoping failed. Try again in a moment.", detail }, { status: 500 });
  }
}
