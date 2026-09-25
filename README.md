# Jess' Guitar Factory: shop operations console

A custom guitar shop run like a professional services org. Internal tool for the shop lead:
**intake → scope → price → staff against real capacity → manage the board.**

Swap "guitar build" for "engagement" and it's a Forward Deployed Engineering ops console.

## The design principle: the model scopes, code decides

- **AI (via Vercel AI Gateway)** turns a messy customer request into a structured work order: required tier, skills, hours by phase, materials, specialists, deadline, risks.
- **Deterministic code** prices it and ranks the real roster on skill fit, availability, deadline and margin.
  Customers are billed at the tier the *work* needs; the shop pays for the tier of *who does it*.
  Over-leveling (a Master on a Senior job) shows up immediately as margin erosion.

## Views

- **Intake:** paste a request, get the scope, effort breakdown, price and ranked staffing options with trade-offs. Book in one click.
- **Capacity:** per-builder 4-week load, backlog and next-free date.
- **Pipeline:** every job with status and assignee; reassign and watch job and blended margin move.

## Code map

| File | What |
| --- | --- |
| `lib/shop.ts` | Operating model: rate card, roster, specialists, seed workload |
| `lib/scope-schema.ts` | Zod schema for the AI's work order |
| `lib/system-prompt.ts` | Scoping rubric, generated from the operating model |
| `lib/engine.ts` | Pricing, staffing, load and margin math |
| `app/api/scope/route.ts` | `generateText` + `Output.object` through AI Gateway |

## Run locally

```bash
export AI_GATEWAY_API_KEY=...        # or: vercel link && vercel env pull
npm run dev
```

No key? `SCOPING_MOCK=1` in `.env.local` returns a canned scope so the UI still works.
`SCOPING_MODEL` overrides the Gateway model slug (default `openai/gpt-6-astra`).

Board state lives in the browser (localStorage) for the demo; "Reset demo data" restores the seed workload.

## Deploy

Push to GitHub → import in Vercel. On Vercel, AI Gateway authenticates via OIDC, so no key is needed in production.
