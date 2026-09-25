"use client";

import { useEffect, useState } from "react";
import { teamStats, withTargets } from "@/lib/engine";
import { seedJobs, type Job, type Targets } from "@/lib/shop";
import { Capacity } from "./components/capacity";
import { Intake } from "./components/intake";
import { Pipeline } from "./components/pipeline";
import { Schedule } from "./components/schedule";
import { pct, usd } from "./components/ui";

const JOBS_KEY = "gf-jobs-v2";
const TARGETS_KEY = "gf-targets-v1";
const TABS = ["Intake", "Master schedule", "Capacity", "Pipeline"] as const;
type Tab = (typeof TABS)[number];

const load = <T,>(key: string): T | null => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
};
const store = (key: string, v: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
};

export default function Console() {
  // Seed data is relative to today, so it's built on the client after mount.
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [targets, setTargets] = useState<Targets>({});
  const [tab, setTab] = useState<Tab>("Intake");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate from storage after mount */
    setJobs(load<Job[]>(JOBS_KEY) ?? seedJobs());
    setTargets(load<Targets>(TARGETS_KEY) ?? {});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (!jobs) return null;

  const roster = withTargets(targets);
  const save = (next: Job[]) => { setJobs(next); store(JOBS_KEY, next); };
  const patch = (id: string, p: Partial<Job>) => save(jobs.map((j) => (j.id === id ? { ...j, ...p } : j)));
  const setTarget = (id: string, t: number) => {
    const next = { ...targets, [id]: Math.min(1, Math.max(0.4, t || 0)) };
    setTargets(next);
    store(TARGETS_KEY, next);
  };
  const reset = () => { save(seedJobs()); setTargets({}); store(TARGETS_KEY, {}); };

  const stats = teamStats(jobs, roster);
  const kpis: [string, string, string?][] = [
    ["Utilization (4 wk)", pct(stats.utilization), `target ${pct(stats.target)}`],
    ["Active jobs", String(stats.activeJobs)],
    ["Booked revenue", usd(stats.booked)],
    ["Blended margin", pct(stats.margin)],
    ["Staffing flags", String(stats.flags)],
    ["Late vs due", String(stats.late)],
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Shop operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Jess&apos; Guitar Factory</h1>
        </div>
        <button onClick={reset} className="text-xs text-[var(--muted)] underline-offset-2 hover:underline">
          Reset demo data
        </button>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(([k, v, sub]) => (
          <div key={k} className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-3">
            <p className="text-xs text-[var(--muted)]">{k}</p>
            <p className="mt-1 font-mono text-xl font-semibold">
              {v}
              {sub && <span className="ml-1.5 font-sans text-xs font-normal text-[var(--muted)]">{sub}</span>}
            </p>
          </div>
        ))}
      </div>

      <nav className="mt-6 mb-5 flex gap-1 overflow-x-auto border-b border-[var(--line)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? "border-[var(--accent)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Intake" && <Intake jobs={jobs} roster={roster} onBook={(job) => { save([...jobs, job]); setTab("Master schedule"); }} />}
      {tab === "Master schedule" && <Schedule jobs={jobs} roster={roster} onChange={patch} />}
      {tab === "Capacity" && <Capacity jobs={jobs} roster={roster} onTarget={setTarget} />}
      {tab === "Pipeline" && <Pipeline jobs={jobs} roster={roster} onChange={patch} />}
    </main>
  );
}
