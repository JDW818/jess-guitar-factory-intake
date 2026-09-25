// Calendar helpers. Dates are local "YYYY-MM-DD" strings, so they sort and compare as text.

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayISO = () => iso(new Date());

export function addDays(s: string, n: number) {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export const fromToday = (days: number) => addDays(todayISO(), days);

// Whole days from today (negative = past). Rounding absorbs DST shifts.
export const dayIndex = (s: string) => Math.round((parse(s).getTime() - parse(todayISO()).getTime()) / 86_400_000);

export const fmt = (s: string) => parse(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
