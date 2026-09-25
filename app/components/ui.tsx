import type { Tier } from "@/lib/shop";

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const pct = (n: number) => `${Math.round(n * 100)}%`;

const TIER_STYLES: Record<Tier, string> = {
  Junior: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  Senior: "bg-sky-100 text-sky-900 ring-sky-300",
  Master: "bg-amber-100 text-amber-900 ring-amber-400",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${TIER_STYLES[tier]}`}>{tier}</span>;
}

export function Card({ title, tone, action, children }: { title: string; tone?: "warn"; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border p-5 ${tone === "warn" ? "border-amber-300 bg-amber-50 text-amber-950" : "border-[var(--line)] bg-[var(--card)]"}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest opacity-70">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LoadBar({ value }: { value: number }) {
  const color = value > 1 ? "bg-red-500" : value > 0.85 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--line)]">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(value, 1) * 100}%` }} />
    </div>
  );
}

export function marginColor(m: number) {
  return m < 0.3 ? "text-red-600" : m < 0.4 ? "text-amber-600" : "text-emerald-600";
}
