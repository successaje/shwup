"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { TicketStub } from "@/components/event/ticket-stub";
import type { StubState } from "@/domain/guest";
import { cn } from "@/lib/cn";

const DEPOSIT = 5n * 10n ** 18n;
const details = { name: "Thursday Builders Night", location: "The Workshop, 2nd floor" };

type Beat = { state: StubState; scanning: boolean; caption: string; ms: number };
const BEATS: Beat[] = [
  { state: "held", scanning: false, caption: "Maya holds a spot with $5.", ms: 2200 },
  { state: "held", scanning: true, caption: "At the door, her ticket is scanned…", ms: 1300 },
  { state: "checkedIn", scanning: false, caption: "…and the $5 is back in her wallet in under a second.", ms: 3200 },
];

/** The product, demonstrated: a ticket that gets scanned and refunded, on a loop. */
export function HeroDemo({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const beat = reduce ? BEATS[2] : BEATS[i];

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setI((n) => (n + 1) % BEATS.length), BEATS[i].ms);
    return () => clearTimeout(t);
  }, [i, reduce]);

  // A static date keeps server and client render identical.
  const startsAt = new Date("2026-10-15T18:30:00");

  return (
    <figure className={cn("relative flex flex-col items-center", className)}>
      <div className="relative w-full max-w-sm">
        <TicketStub
          key={beat.state}
          details={details}
          startsAt={startsAt}
          deposit={DEPOSIT}
          state={beat.state}
          footnote={beat.state === "held" ? "0x7099…79C8" : undefined}
          code={beat.state === "held" ? <FakeCode /> : undefined}
        />
        {beat.scanning && (
          <div aria-hidden className="pointer-events-none absolute right-6 bottom-6 size-22 overflow-hidden rounded-sm">
            <div className="h-0.5 w-full animate-[scan_1.2s_ease-in-out_infinite] bg-stamp shadow-[0_0_12px_var(--stamp)]" />
          </div>
        )}
      </div>
      <figcaption className="mt-6 h-10 max-w-xs text-center text-sm text-ink-2" aria-live="polite">
        <span key={beat.caption} className="inline-block animate-fade">
          {beat.caption}
        </span>
      </figcaption>
    </figure>
  );
}

/** Decorative QR-like block for the demo ticket (not scannable on purpose). */
function FakeCode() {
  const cells = [
    1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0,
    1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1,
  ];
  return (
    <div aria-hidden className="grid size-22 shrink-0 grid-cols-9 gap-px rounded-sm bg-[#fbfaf5] p-1.5">
      {cells.slice(0, 81).map((c, i) => (
        <span key={i} className={c ? "bg-[#18170f]" : "bg-transparent"} />
      ))}
    </div>
  );
}
