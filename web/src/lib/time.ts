const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/** "Sat, Oct 11 · 6:30 PM", optionally with the viewer's zone: "Sat, Oct 11 · 6:30 PM WAT". */
export function formatWhen(d: Date, { zone = false } = {}): string {
  const base = `${dayFmt.format(d)} · ${timeFmt.format(d)}`;
  if (!zone) return base;
  const tz = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(d).find((p) => p.type === "timeZoneName")?.value;
  return tz ? `${base} ${tz}` : base;
}

export function formatTime(d: Date): string {
  return timeFmt.format(d);
}

/** "in 3 days", "in 2 hours", "5 minutes ago" */
export function relative(d: Date, now = new Date()): string {
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return diff >= 0 ? "in a moment" : "just now";
}

/** Value for <input type="datetime-local"> in the person's own timezone. */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const toSeconds = (d: Date) => BigInt(Math.floor(d.getTime() / 1000));
