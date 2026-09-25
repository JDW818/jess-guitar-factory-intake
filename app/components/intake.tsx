"use client";

import { useState } from "react";
import { fmt, fromToday } from "@/lib/dates";
import { priceScope, staffingOptions, utilLevel, whyRecommended, type StaffingOption } from "@/lib/engine";
import type { Scope } from "@/lib/scope-schema";
import { SPECIALISTS, TIERS, type Job } from "@/lib/shop";
import { Card, TierBadge, UTIL_TEXT, marginColor, pct, usd } from "./ui";

const EXAMPLES: [string, string][] = [
  ["Jazz trio, LH", "From Blue Line Jazz Trio: we need a left-handed semi-hollow for our guitarist, flame maple top, humbuckers, amber burst. Mid-tier budget. Gigging by early November."],
  ["Beginner", "Austin Music Academy wants another Strat-style guitar for the student program, sunburst, stock everything. No rush."],
  ["Metal rush job", "Grimhold again: baritone 7-string, Brazilian rosewood board, abalone inlays, active pickups. Tour starts in 5 weeks."],
];

export function Intake({ jobs, onBook }: { jobs: Job[]; onBook: (job: Job) => void }) {
  const [text, setText] = useState("");
  const [scope, setScope] = useState<Scope | null>(null);
  const [model, setModel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    setScope(null);
    try {
      const res = await fetch("/api/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error([data.error ?? "Something went wrong.", data.detail].filter(Boolean).join(" "));
      setScope(data.scope);
      setModel(data.model);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function book(opt: StaffingOption) {
    if (!scope) return;
    const p = priceScope(scope);
    onBook({
      id: crypto.randomUUID(),
      title: scope.title,
      customer: scope.customer ?? "New customer",
      tier: scope.requiredTier,
      skills: scope.skills,
      assigneeId: opt.builder.id,
      hours: p.hours,
      hoursDone: 0,
      price: opt.price,
      materialsCost: p.materialsCost,
      specialistsCost: p.specialistsCost,
      needsReview: scope.needsReview,
      status: "Scheduled",
      start: opt.start,
      end: opt.end,
      due: scope.deadlineWeeks != null ? fromToday(scope.deadlineWeeks * 7) : null,
    });
    setScope(null);
    setText("");
  }

  return (
    <div className="space-y-5">
      <Card title="Incoming request">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Paste the customer's email or intake notes…"
          className="w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--background)] p-3 outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {EXAMPLES.map(([label, ex]) => (
            <button key={label} onClick={() => setText(ex)} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]">
              {label}
            </button>
          ))}
          <button
            onClick={run}
            disabled={loading || text.trim().length < 5}
            className="ml-auto rounded-xl bg-[var(--accent)] px-5 py-2.5 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Scoping…" : "Scope it"}
          </button>
        </div>
      </Card>

      {error && <p className="rounded-xl bg-red-100 p-4 text-red-900">{error}</p>}
      {scope && <ScopeResult scope={scope} jobs={jobs} model={model} onBook={book} />}
    </div>
  );
}

function ScopeResult({ scope, jobs, model, onBook }: { scope: Scope; jobs: Job[]; model: string; onBook: (o: StaffingOption) => void }) {
  const p = priceScope(scope);
  const options = staffingOptions(scope, jobs).slice(0, 3);
  const best = options[0];

  return (
    <div className="space-y-5">
      {scope.needsReview && (
        <div className="rounded-xl border border-amber-400 bg-amber-100 p-4 text-sm font-medium text-amber-950">
          ⚑ Flagged for lead review before this goes to the customer.
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Scope">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{scope.title}</h3>
            <TierBadge tier={scope.requiredTier} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {scope.customer ?? "New customer"} · {scope.complexity} · ≈ {TIERS[scope.requiredTier].services}
            {scope.deadlineWeeks != null && ` · due ${fmt(fromToday(scope.deadlineWeeks * 7))}`}
          </p>
          <p className="mt-3 text-sm leading-relaxed">{scope.tierRationale}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {scope.skills.map((s) => (
              <span key={s} className="rounded-md bg-[var(--line)] px-2 py-0.5 text-xs">{s}</span>
            ))}
          </div>
        </Card>

        <Card title={`Effort · ${p.hours} hrs`}>
          <ul className="space-y-1.5 text-sm">
            {scope.effort.map((e) => (
              <li key={e.phase} className="flex items-center gap-3">
                <span className="w-24 capitalize text-[var(--muted)]">{e.phase}</span>
                <div className="h-2 flex-1 rounded-full bg-[var(--line)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(e.hours / p.hours) * 100}%` }} />
                </div>
                <span className="w-12 text-right font-mono">{e.hours}h</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-[var(--line)] pt-3 text-sm">
            <Row k={`Labor (${p.hours}h × ${usd(TIERS[scope.requiredTier].billRate)})`} v={usd(p.labor)} />
            <Row k={`Materials (${scope.materials.length} items, +30%)`} v={usd(p.materials)} />
            {scope.specialists.map((s) => (
              <Row key={s.type} k={SPECIALISTS[s.type].label} v={usd(SPECIALISTS[s.type].price)} hint={s.reason} />
            ))}
          </div>
        </Card>
      </div>

      <Card title="Who should build it" action={<span className="text-xs text-[var(--muted)]">top 3 · skill fit, capacity vs target, margin</span>}>
        <div className="space-y-3">
          {options.map((o) => (
            <div key={o.builder.id} className={`rounded-xl border p-4 ${o === best ? "border-[var(--accent)] bg-[var(--background)]" : "border-[var(--line)]"}`}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="min-w-44">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{o.builder.name}</span>
                    <TierBadge tier={o.builder.tier} />
                    {o === best && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Best fit</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{whyRecommended(o, scope)}</p>
                </div>
                <Stat k="Dates" v={`${fmt(o.start)} – ${fmt(o.end)}`} warn={o.rush} />
                <Stat k="Peak util" v={`${pct(o.peak)} / ${pct(o.builder.utilTarget)}`} cls={UTIL_TEXT[utilLevel(o.peak, o.builder.utilTarget)]} />
                <Stat k="Price" v={usd(o.price)} />
                <Stat k="Margin" v={pct(o.margin)} cls={marginColor(o.margin)} />
                <button onClick={() => onBook(o)} className="ml-auto rounded-lg border border-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white">
                  Assign & book
                </button>
              </div>
              {(o.overLeveled || o.rush || o.missing.length > 0 || o.overTarget) && (
                <ul className="mt-2 space-y-0.5 text-xs text-amber-700">
                  {o.missing.length > 0 && <li className="text-red-600">Outside skill range: missing {o.missing.join(", ")}</li>}
                  {o.overTarget && <li>{o.peak > 1 ? "Overloads" : "Pushes over target:"} {o.builder.name} peaks at {pct(o.peak)} against a {pct(o.builder.utilTarget)} target.</li>}
                  {o.overLeveled && <li>Over-leveled: billed at {scope.requiredTier} rate, costed at {o.builder.tier}. Margin takes the hit.</li>}
                  {o.rush && <li>Can&apos;t hit the deadline at a sustainable pace; compressed to finish by it (+{usd(o.rushFee)} rush).</li>}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Card>

      {scope.risks.length > 0 && (
        <Card title="Risks & assumptions" tone="warn">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {scope.risks.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </Card>
      )}

      <p className="text-center text-xs text-[var(--muted)]">{model === "mock" ? "Mock scoping (SCOPING_MOCK=1)" : `Scoped by ${model} via Vercel AI Gateway`} · priced and staffed in code</p>
    </div>
  );
}

function Row({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="flex justify-between gap-4" title={hint}>
      <span className="text-[var(--muted)]">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}

function Stat({ k, v, warn, cls }: { k: string; v: string; warn?: boolean; cls?: string }) {
  return (
    <div className="text-sm">
      <p className="text-xs text-[var(--muted)]">{k}</p>
      <p className={`font-mono font-semibold ${warn ? "text-amber-600" : cls ?? ""}`}>{v}</p>
    </div>
  );
}
