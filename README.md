# Jess's Guitar Factory

A guitar shop on the surface, a professional services org underneath: intake → scope → tier the work → staff the right builder → pull in specialists for the full rig → price it → flag risk.

## How it works

- `lib/tiers.ts`: the rate card (tiers, base prices, lead times, cost shares). Single source of truth.
- `lib/system-prompt.ts`: the scoping rubric, generated from the rate card.
- `lib/quote-schema.ts`: Zod schema for the structured quote.
- `app/api/quote/route.ts`: calls the model through **Vercel AI Gateway** (`generateText` + `Output.object`), then computes totals, rush surcharge and margin in code. The model scopes, code does the math.
- `app/page.tsx`: intake form and quote card.

## Run locally

```bash
export AI_GATEWAY_API_KEY=...   # or: vercel link && vercel env pull
npm run dev
```

Optional: `QUOTE_MODEL` overrides the Gateway model slug (default `openai/gpt-6-astra`).

## Deploy

Push to GitHub → import in Vercel. On Vercel, AI Gateway authenticates via OIDC automatically, so no key is needed in production.
