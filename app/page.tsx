"use client";

import { useEffect, useState } from "react";
import { teamStats } from "@/lib/engine";
import { SEED_JOBS, type Job } from "@/lib/shop";
import { Capacity } from "./components/capacity";
import { Intake } from "./components/intake";
import { Pipeline } from "./components/pipeline";
import { pct, usd } from "./components/ui";

const STORAGE_KEY = "gf-jobs-v1";
const TABS = ["Intake", "Capacity", "Pipeline"] as const;
type Tab = (typeof TABS)[number];

export default function Console() {
  const [jobs, setJobs] = useState<Job[]>(SEED_JOBS);
  const [tab, setTab] = useState<Tab>("Intake");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount
      if (saved) setJobs(JSON.parse(saved));
    } catch {}
  }, []);

  function save(next: Job[]) {
    setJobs(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  const stats = teamStats(jobs);
  const kpis: [string, string][] = [
    ["Team load (4 wk)", pct(stats.utilization)],
    ["Active jobs", String(stats.activeJobs)],
    ["Backlog", `${stats.remaining}h`],
    ["Booked revenue", usd(stats.booked)],
    ["Blended margin", pct(stats.margin)],
    ["Needs review", String(stats.reviews)],
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Shop operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Jess&apos;s Guitar Factory</h1>
        </div>
        <button onClick={() => save(SEED_JOBS)} className="text-xs text-[var(--muted)] underline-offset-2 hover:underline">
          Reset demo data
        </button>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
            <p className="text-xs text-[var(--muted)]">{k}</p>
            <p className="mt-1 font-mono text-xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <nav className="mt-6 mb-5 flex gap-1 border-b border-[var(--line)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? "border-[var(--accent)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Intake" && <Intake jobs={jobs} onBook={(job) => { save([job, ...jobs]); setTab("Capacity"); }} />}
      {tab === "Capacity" && <Capacity jobs={jobs} />}
      {tab === "Pipeline" && <Pipeline jobs={jobs} onChange={(id, patch) => save(jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)))} />}
    </main>
  );
}
