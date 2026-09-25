"use client";

import { useState } from "react";
import type { Quote } from "@/lib/quote-schema";

type QuoteResponse = Omit<Quote, "pricing"> & {
  pricing: Quote["pricing"] & { specialists: number; rushSurcharge: number; total: number };
  economics: { servicesTier: string; marginPct: number };
  model: string;
};

const TIER_STYLES: Record<Quote["builder"]["tier"], string> = {
  "Junior Builder": "bg-emerald-100 text-emerald-900 ring-emerald-300",
  "Senior Builder": "bg-sky-100 text-sky-900 ring-sky-300",
  "Master Builder": "bg-amber-100 text-amber-900 ring-amber-400",
};

const EXAMPLES = [
  "Semi-hollow jazz box, left-handed, flame maple top, humbuckers, mid-tier budget, need it by March.",
  "Just a solid Strat-style guitar in sunburst for a beginner. Nothing fancy.",
  "Baritone 7-string for a metal band, Brazilian rosewood fretboard, abalone inlays, tour starts in 5 weeks.",
];

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default function Home() {
  const [text, setText] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setQuote(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-[var(--accent)]">Custom build quote</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">Jess&apos;s Guitar Factory</h1>
        <p className="mt-3 text-[var(--muted)]">
          Tell us what you want to play. We&apos;ll scope it, pick the right builder, and price the full rig.
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
        <label htmlFor="req" className="mb-2 block font-medium">Describe your dream build</label>
        <textarea
          id="req"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="e.g. semi-hollow jazz box, left-handed, flame maple top, humbuckers, mid-tier budget, need it by March."
          className="w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--background)] p-3 outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setText(ex)}
              className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              {["Jazz box", "Beginner", "Metal rush job"][i]}
            </button>
          ))}
        </div>
        <button
          onClick={submit}
          disabled={loading || text.trim().length < 5}
          className="mt-4 w-full rounded-xl bg-[var(--accent)] px-5 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Scoping your build…" : "Build My Quote"}
        </button>
      </section>

      {error && <p className="mt-6 rounded-xl bg-red-100 p-4 text-red-900">{error}</p>}

      {quote && <QuoteCard q={quote} />}
    </main>
  );
}

function QuoteCard({ q }: { q: QuoteResponse }) {
  const spec: [string, string | null][] = [
    ["Body", q.spec.bodyStyle],
    ["Handedness", q.spec.handedness === "left" ? "Left-handed" : "Right-handed"],
    ["Tonewood", q.spec.tonewood],
    ["Finish", q.spec.finish],
    ["Pickups", q.spec.pickups],
    ["Scale", q.spec.scaleLength],
    ...q.spec.otherRequests.map((r): [string, string] => ["Also", r]),
  ];

  return (
    <article className="mt-8 space-y-5">
      {q.needsHumanReview && (
        <div className="rounded-xl border border-amber-400 bg-amber-100 p-4 font-medium text-amber-950">
          ⚑ Needs human review: a shop lead will confirm this quote before it goes out.
        </div>
      )}

      <Card title="Assigned builder">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ${TIER_STYLES[q.builder.tier]}`}>
            {q.builder.tier}
          </span>
          <span className="text-sm text-[var(--muted)]">
            {q.complexity} complexity · ≈ {q.economics.servicesTier}
          </span>
        </div>
        <p className="mt-3 leading-relaxed">{q.builder.rationale}</p>
      </Card>

      <Card title="The build">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          {spec.filter(([, v]) => v).map(([k, v], i) => (
            <div key={i} className="contents">
              <dt className="text-[var(--muted)]">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {q.fullRig.length > 0 && (
        <Card title="Recommended full rig">
          <ul className="space-y-3">
            {q.fullRig.map((s, i) => (
              <li key={i} className="flex justify-between gap-4">
                <div>
                  <p className="font-medium">{s.specialist}</p>
                  <p className="text-sm text-[var(--muted)]">{s.reason}</p>
                </div>
                <span className="shrink-0 font-mono text-sm">+{usd(s.addOnPrice)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Price">
        <table className="w-full text-sm">
          <tbody className="[&_td]:py-1.5 [&_td:last-child]:text-right [&_td:last-child]:font-mono">
            <tr><td>Base build ({q.builder.tier})</td><td>{usd(q.pricing.baseBuild)}</td></tr>
            {q.pricing.addOns > 0 && <tr><td>Build upgrades</td><td>{usd(q.pricing.addOns)}</td></tr>}
            {q.pricing.specialists > 0 && <tr><td>Specialists</td><td>{usd(q.pricing.specialists)}</td></tr>}
            {q.pricing.rushSurcharge > 0 && <tr><td>Rush surcharge (25%)</td><td>{usd(q.pricing.rushSurcharge)}</td></tr>}
            <tr className="border-t border-[var(--line)] text-base font-semibold">
              <td className="pt-3">Total</td><td className="pt-3">{usd(q.pricing.total)}</td>
            </tr>
          </tbody>
        </table>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--muted)]">
          <span>Lead time: <strong className="text-[var(--foreground)]">{q.leadTimeWeeks} weeks</strong></span>
          <span>Est. shop margin: <strong className="text-[var(--foreground)]">{q.economics.marginPct}%</strong></span>
        </div>
      </Card>

      {q.risks.length > 0 && (
        <Card title="Risks & assumptions" tone="warn">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {q.risks.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </Card>
      )}

      <Card title="Your quote">
        <p className="leading-relaxed">{q.quoteSummary}</p>
      </Card>

      <p className="text-center text-xs text-[var(--muted)]">Scoped by {q.model} via Vercel AI Gateway</p>
    </article>
  );
}

function Card({ title, tone, children }: { title: string; tone?: "warn"; children: React.ReactNode }) {
  return (
    <section
      className={`rounded-2xl border p-5 ${
        tone === "warn" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-[var(--line)] bg-[var(--card)]"
      }`}
    >
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest opacity-70">{title}</h2>
      {children}
    </section>
  );
}
