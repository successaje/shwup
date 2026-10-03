import { AlertTriangle, Check, CircleSlash, RotateCcw } from "lucide-react";
import type { ScanOutcome, ScanResult } from "@/hooks/use-door";
import { shortAddress } from "@/lib/address";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/money";

const COPY: Record<ScanOutcome, { title: string; tone: "ok" | "warn" | "bad"; icon: typeof Check }> = {
  checkedIn: { title: "Checked in", tone: "ok", icon: Check },
  already: { title: "Already checked in", tone: "warn", icon: RotateCcw },
  notOnList: { title: "No spot held", tone: "bad", icon: CircleSlash },
  wrongEvent: { title: "Ticket for another event", tone: "bad", icon: CircleSlash },
  invalid: { title: "Not a ShwUp ticket", tone: "bad", icon: CircleSlash },
  failed: { title: "Couldn't check in", tone: "bad", icon: AlertTriangle },
};

const TONES = {
  ok: "bg-ok text-white dark:text-sunken",
  warn: "bg-warn-soft text-ink border border-warn/30",
  bad: "bg-danger-soft text-ink border border-danger/25",
};

/** The big, glanceable answer for whoever is at the door. */
export function ScanResultCard({ result, deposit }: { result: ScanResult; deposit: bigint }) {
  const c = COPY[result.outcome];
  const Icon = c.icon;
  return (
    <div key={result.seq} role="status" aria-live="assertive" className={cn("flex animate-rise items-center gap-4 rounded-lg px-5 py-4", TONES[c.tone])}>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", c.tone === "ok" ? "bg-white/20" : "bg-surface")}>
        <Icon className={cn("size-5", c.tone === "warn" && "text-warn", c.tone === "bad" && "text-danger")} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg leading-tight font-medium">{c.title}</p>
        <p className={cn("mt-0.5 truncate text-sm", c.tone === "ok" ? "opacity-90" : "text-ink-2")}>
          {result.outcome === "checkedIn"
            ? `${formatUsd(deposit)} returned · final in ${((result.finalityMs ?? 0) / 1000).toFixed(1)}s`
            : (result.detail ?? (result.holder ? shortAddress(result.holder) : "Try the next one."))}
        </p>
      </div>
      {result.holder && result.outcome === "checkedIn" && <span className="num hidden text-sm opacity-90 sm:inline">{shortAddress(result.holder)}</span>}
    </div>
  );
}

export function ScanFeedItem({ result }: { result: ScanResult }) {
  const c = COPY[result.outcome];
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <span className={cn("size-2 shrink-0 rounded-full", c.tone === "ok" ? "bg-ok" : c.tone === "warn" ? "bg-warn" : "bg-danger")} />
      <span className="num w-28 shrink-0 text-ink-2">{result.holder ? shortAddress(result.holder) : "—"}</span>
      <span className="truncate text-ink-3">{c.title}</span>
    </li>
  );
}
