"use client";

import { useEffect, useState } from "react";
import { seedJobs, type Job } from "@/lib/shop";
import { Intake } from "./components/intake";
import { Team } from "./components/team";

export default function Shop() {
  // Seed jobs are dated relative to today, so build them on the client.
  // State is in-memory: every page load starts from the same shop floor.
  const [jobs, setJobs] = useState<Job[] | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only seed
  useEffect(() => setJobs(seedJobs()), []);
  if (!jobs) return null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Shop floor</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Jess&apos; Guitar Factory</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Scope the build, staff the right builder, price it.</p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_22rem]">
        <Intake jobs={jobs} onBook={(job) => setJobs([...jobs, job])} />
        <div className="lg:sticky lg:top-6">
          <Team jobs={jobs} />
        </div>
      </div>
    </main>
  );
}
