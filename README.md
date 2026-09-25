# Jess' Guitar Factory

A custom guitar shop's intake desk: paste a customer request, and it scopes the build, recommends who should build it, and prices it.

## How it works: the model scopes, code decides

1. **Scope (AI through Vercel AI Gateway).** `app/api/scope/route.ts` uses `generateText` + `Output.object` to turn a messy request into a structured work order: builder tier, required skills, hours by phase, materials, specialists, deadline, risks.
2. **Staff (code).** `lib/engine.ts` ranks builders on skill fit, capacity against each person's utilization target, timing and margin, and says plainly what each option costs (over target, rush, over-leveled).
3. **Price (code).** Customers pay for the tier the work needs; the shop pays for whoever does it. Totals and margin are computed, never generated.

Book a job and the team panel updates live.

## Code map

| File | What |
| --- | --- |
| `lib/shop.ts` | Operating model: rate card, roster + utilization targets, specialists, seed workload |
| `lib/scope-schema.ts` | Zod schema for the AI's work order |
| `lib/system-prompt.ts` | Scoping rubric, generated from the operating model |
| `lib/engine.ts` | Pricing, capacity and staffing |
| `app/api/scope/route.ts` | The model call |

## Run locally

```bash
export AI_GATEWAY_API_KEY=...        # or: vercel link && vercel env pull
npm run dev
```

No key? Put `SCOPING_MOCK=1` in `.env.local` for a canned scope. `SCOPING_MODEL` overrides the Gateway model (default `openai/gpt-6-astra`).

## Deploy

Push to GitHub → import in Vercel. On Vercel, AI Gateway authenticates via OIDC, so production needs no key.
