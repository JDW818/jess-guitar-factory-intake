"use client";

import { useState } from "react";
import { fmt, fromToday } from "@/lib/dates";
import {
  distinguishingSkills, draftJob, priceScope, rolloutPlan, staffingOptions, tourTech, utilLevel, whyRecommended,
  type RolloutPlan, type StaffingOption,
} from "@/lib/engine";
import type { Scope } from "@/lib/scope-schema";
import { ENGAGEMENT_LABELS, FULFILLMENT, PARTNER, PLANNING_WEEKS, SPECIALISTS, TIERS, TOUR_TECH, type Builder, type Fulfillment, type Job } from "@/lib/shop";
import { Card, TierBadge, UTIL_TEXT, marginColor, pct, usd } from "./ui";

const EXAMPLES: [string, string][] = [
  ["Jazz trio, LH", "From Blue Line Jazz Trio: we need a left-handed semi-hollow for our guitarist, flame maple top, humbuckers, amber burst. Mid-tier budget. Gigging by early November."],
  ["Saves the Day tour", "Saves the Day again: baritone 7-string, Brazilian rosewood board, abalone inlays, active pickups. Tour starts in 5 weeks and runs 6 weeks, and they want a tech on the road with them to keep the rig dialed in."],
  ["School district", "Austin ISD music program: 40 student guitars for the spring semester. Strat-style and stock specs are fine, but refinished in school colors (maroon, white pickguard) with the district crest engraved on the neck plate, all set up and ready to play. Need them in 6 weeks."],
];

export function Intake({ jobs, onBook }: { jobs: Job[]; onBook: (jobs: Job[]) => void }) {
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

  function book(booked: Job[]) {
    onBook(booked);
    setScope(null);
    setText("");
  }

  function bookBuilder(opt: StaffingOption) {
    if (!scope) return;
    const p = priceScope(scope);
    const tech = tourTech(scope);
    book([{
      ...draftJob(scope, {
        assigneeId: opt.builder.id, hours: p.hours, price: opt.price,
        materialsCost: p.materialsCost, specialistsCost: p.specialistsCost,
      }, 0, 0),
      start: opt.start,
      end: opt.end,
      ...(tech && { tourSupport: { weeks: tech.weeks, price: tech.price, cost: tech.cost } }),
    }]);
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
      {scope && <ScopeResult scope={scope} jobs={jobs} model={model} onBookBuilder={bookBuilder} onBookJobs={book} />}
    </div>
  );
}

type ResultProps = { scope: Scope; jobs: Job[]; model: string; onBookBuilder: (o: StaffingOption) => void; onBookJobs: (j: Job[]) => void };

function ScopeResult({ scope, jobs, model, onBookBuilder, onBookJobs }: ResultProps) {
  const p = priceScope(scope);
  const tech = tourTech(scope);
  const rollout = scope.engagement === "rollout";

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
            {scope.customer ?? "New customer"} · {scope.complexity}
            {scope.deadlineWeeks != null && ` · due ${fmt(fromToday(scope.deadlineWeeks * 7))}`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 font-semibold text-white">
              {ENGAGEMENT_LABELS[scope.engagement]}{p.qty > 1 && ` · ${p.qty} units`}
            </span>
            <span className="text-[var(--muted)]">{scope.engagementRationale}</span>
          </div>
          <FulfillmentStrip value={scope.fulfillment} />
          <p className="mt-3 text-sm leading-relaxed">{scope.tierRationale}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {distinguishingSkills(scope.skills).map((s) => (
              <span key={s} className="rounded-md bg-[var(--line)] px-2 py-0.5 text-xs">{s}</span>
            ))}
          </div>
        </Card>

        <Card title={p.qty > 1 ? `Effort · ${p.unitHours} hrs/unit × ${p.qty} = ${p.hours} hrs` : `Effort · ${p.hours} hrs`}>
          <ul className="space-y-1.5 text-sm">
            {scope.effort.map((e) => (
              <li key={e.phase} className="flex items-center gap-3">
                <span className="w-24 capitalize text-[var(--muted)]">{e.phase}</span>
                <div className="h-2 flex-1 rounded-full bg-[var(--line)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(e.hours / p.unitHours) * 100}%` }} />
                </div>
                <span className="w-12 text-right font-mono">{e.hours}h</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-[var(--line)] pt-3 text-sm">
            <Row k={`Labor (${p.hours}h × ${usd(TIERS[scope.requiredTier].billRate)})`} v={usd(p.labor)} />
            <Row k={`Materials (${scope.materials.length} item${scope.materials.length > 1 ? "s" : ""}${p.qty > 1 ? ` × ${p.qty}` : ""}, +30%)`} v={usd(p.materials)} />
            {scope.specialists.map((s) => (
              <Row key={s.type} k={SPECIALISTS[s.type].label} v={usd(SPECIALISTS[s.type].price)} hint={s.reason} />
            ))}
            <div className="flex justify-between gap-4 border-t border-[var(--line)] pt-1.5 font-semibold">
              <span>Build subtotal</span><span className="font-mono">{usd(p.price)}</span>
            </div>
          </div>
        </Card>
      </div>

      {rollout ? (
        <RolloutCard plan={rolloutPlan(scope, jobs)} onBook={onBookJobs} />
      ) : (
        <Staffing scope={scope} jobs={jobs} onBook={onBookBuilder} />
      )}

      {tech && <TourSupport scope={scope} tech={tech} />}

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

function Staffing({ scope, jobs, onBook }: { scope: Scope; jobs: Job[]; onBook: (o: StaffingOption) => void }) {
  const options = staffingOptions(scope, jobs).slice(0, 3);
  const best = options[0];
  return (
    <Card title="Who should build it" action={<span className="text-xs text-[var(--muted)]">top 3 · skills, capacity, margin</span>}>
      <div className="space-y-3">
        {options.map((o) => (
          <div key={o.builder.id} className={`rounded-xl border p-4 ${o === best ? "border-[var(--accent)] bg-[var(--background)]" : "border-[var(--line)]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{o.builder.name}</span>
                  <TierBadge tier={o.builder.tier} />
                  {o === best && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Best fit</span>}
                </div>
                <p className="mt-0.5 text-xs text-[var(--muted)]">{whyRecommended(o)}</p>
              </div>
              <button onClick={() => onBook(o)} className="rounded-lg border border-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white">
                Assign & book
              </button>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat k="Dates" v={`${fmt(o.start)} – ${fmt(o.end)}`} warn={o.rush} />
              <div className="text-sm">
                <p className="text-xs text-[var(--muted)]">Load · next {PLANNING_WEEKS} wks</p>
                <span className="[&>span]:items-start"><LoadChange builder={o.builder} load={o.load} /></span>
              </div>
              <Stat k="Price" v={usd(o.price)} />
              <Stat k="Margin" v={pct(o.margin)} cls={marginColor(o.margin)} />
            </dl>

            {(o.missing.length > 0 || o.overloaded || o.overLeveled || o.rush) && (
              <ul className="mt-3 space-y-0.5 text-xs text-amber-700">
                {o.missing.length > 0 && <li className="text-red-600">Missing {o.missing.join(", ")}.</li>}
                {o.overloaded && <li>Busiest week hits {pct(o.load.peak)} of their hours.</li>}
                {o.overLeveled && <li>Over-leveled: billed at {scope.requiredTier} rate, costed at {o.builder.tier}.</li>}
                {o.rush && <li>Compressed to finish by the deadline: +{usd(o.rushFee)} rush.</li>}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// Before → after on the same 4-week measure the team panel shows.
function LoadChange({ builder, load }: { builder: Builder; load: { before: number; after: number } }) {
  return (
    <span className="inline-flex flex-col items-end sm:items-start">
      <span className="whitespace-nowrap font-mono font-semibold">
        <span className="text-[var(--muted)]">{pct(load.before)} → </span>
        <span className={UTIL_TEXT[utilLevel(load.after, builder.utilTarget)]}>{pct(load.after)}</span>
      </span>
      <span className="text-[10px] text-[var(--muted)]">target {pct(builder.utilTarget)}</span>
    </span>
  );
}

const FULFILLMENT_NOTES: Record<Fulfillment, string> = {
  "in stock": "Off the wall: set up and ship",
  "modified stock": "Stock guitar, changed",
  "made to order": "Catalog design, built fresh",
  "fully custom": "Bespoke build",
};

function FulfillmentStrip({ value }: { value: Fulfillment }) {
  const at = FULFILLMENT.indexOf(value);
  return (
    <div className="mt-3">
      <div className="grid grid-cols-4 gap-1">
        {FULFILLMENT.map((f, i) => (
          <div key={f} className={`rounded-md px-1.5 py-1 text-center text-[11px] font-medium ${i === at ? "bg-[var(--foreground)] text-[var(--background)]" : i < at ? "bg-[var(--line)] text-[var(--muted)]" : "border border-dashed border-[var(--line)] text-[var(--muted)]"}`}>
            {f}
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">Fulfillment: {FULFILLMENT_NOTES[value]}</p>
    </div>
  );
}

function RolloutCard({ plan, onBook }: { plan: RolloutPlan; onBook: (j: Job[]) => void }) {
  const { inHouse, partner } = plan;
  return (
    <Card title={`Who delivers it · ${plan.units} units by ${fmt(plan.end)}`} action={<span className="text-xs text-[var(--muted)]">same price to the customer · margin vs capacity</span>}>
      <div className="grid gap-3 md:grid-cols-2">
        <Option
          title="Build in-house"
          recommended={plan.recommended === "in-house"}
          margin={inHouse.margin}
          onBook={() => onBook(inHouse.jobs)}
        >
          <p>{plan.hours}h split across the crew (load, next {PLANNING_WEEKS} wks):</p>
          <ul className="mt-1 space-y-0.5">
            {inHouse.crew.map((c) => (
              <li key={c.builder.id} className="flex justify-between">
                <span>{c.builder.name}</span>
                <LoadChange builder={c.builder} load={c.load} />
              </li>
            ))}
          </ul>
          {inHouse.overTarget && <p className="mt-1 text-amber-700">Pushes the crew over target. Bespoke work queues behind it.</p>}
        </Option>

        {partner ? (
          <Option
            title={`${PARTNER.label}`}
            recommended={plan.recommended === "partner"}
            margin={partner.margin}
            onBook={() => onBook([partner.job])}
          >
            <p>{PARTNER.name} builds and sets up all {plan.units} units.</p>
            <p className="mt-1 flex justify-between">
              <span>{partner.qaBuilder.name} QA ({partner.qaHours}h)</span>
              <LoadChange builder={partner.qaBuilder} load={partner.qaLoad} />
            </p>
            <p className="mt-1 text-[var(--muted)]">Thinner margin; the shop keeps its capacity for custom work.</p>
          </Option>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">
            {PARTNER.label} only takes repeatable work (stock or modified stock). This rollout stays in-house.
          </div>
        )}
      </div>
    </Card>
  );
}

function Option({ title, recommended, margin, onBook, children }: { title: string; recommended: boolean; margin: number; onBook: () => void; children: React.ReactNode }) {
  return (
    <div className={`flex flex-col rounded-xl border p-4 ${recommended ? "border-[var(--accent)] bg-[var(--background)]" : "border-[var(--line)]"}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold">{title}</span>
        {recommended && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Recommended</span>}
        <span className={`ml-auto whitespace-nowrap font-mono text-sm font-semibold ${marginColor(margin)}`}>{pct(margin)} margin</span>
      </div>
      <div className="mt-2 flex-1 text-xs">{children}</div>
      <button onClick={onBook} className="mt-3 self-start rounded-lg border border-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white">
        Book
      </button>
    </div>
  );
}

function TourSupport({ scope, tech }: { scope: Scope; tech: NonNullable<ReturnType<typeof tourTech>> }) {
  // Support starts when the guitar is delivered: the deadline if there is one.
  const startDay = scope.deadlineWeeks != null ? Math.round(scope.deadlineWeeks * 7) : 0;
  const start = fromToday(startDay);
  const end = fromToday(startDay + tech.weeks * 7 - 1);
  return (
    <Card title="On the road · after delivery" action={<span className="text-xs text-[var(--muted)]">books with the build</span>}>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="min-w-56 flex-1">
          <p className="font-semibold">{TOUR_TECH.label}</p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            Travels with {scope.customer ?? "the customer"} {fmt(start)} – {fmt(end)} to keep the rig dialed in.
          </p>
        </div>
        <Stat k="Rate" v={`${usd(TOUR_TECH.weeklyPrice)}/wk × ${tech.weeks}`} />
        <Stat k="Recurring" v={usd(tech.price)} />
        <Stat k="Margin" v={pct(tech.margin)} cls={marginColor(tech.margin)} />
      </div>
    </Card>
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
