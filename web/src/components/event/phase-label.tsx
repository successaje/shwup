import type { EventPhase } from "@/domain/event";
import { cn } from "@/lib/cn";

const PHASES: Record<EventPhase, { label: string; dot: string }> = {
  open: { label: "Taking RSVPs", dot: "bg-ink-3" },
  doors: { label: "Doors open", dot: "bg-ok animate-pulse" },
  closed: { label: "Check-in closed", dot: "bg-warn" },
  settled: { label: "Settled", dot: "bg-ink-3" },
  cancelled: { label: "Cancelled", dot: "bg-danger" },
};

export function PhaseLabel({ phase, className }: { phase: EventPhase; className?: string }) {
  const p = PHASES[phase];
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm text-ink-2", className)}>
      <span className={cn("size-2 rounded-full", p.dot)} aria-hidden />
      {p.label}
    </span>
  );
}
