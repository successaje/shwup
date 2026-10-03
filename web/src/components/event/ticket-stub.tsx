import { CalendarDays, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import type { EventDetails } from "@/domain/event";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/money";
import { formatWhen } from "@/lib/time";

export type StubState = "preview" | "held" | "checkedIn" | "released" | "noShow" | "cancelled";

const STATUS: Record<StubState, { label: string; tone: string }> = {
  preview: { label: "Deposit", tone: "text-ink-2" },
  held: { label: "Held until you arrive", tone: "text-ink" },
  checkedIn: { label: "Back in your wallet", tone: "text-ok" },
  released: { label: "Refunded", tone: "text-ink-2" },
  noShow: { label: "Forfeited", tone: "text-ink-3 line-through" },
  cancelled: { label: "Event cancelled", tone: "text-ink-2" },
};

/**
 * The ticket — ShwUp's central object. The top half is the event; below the perforation is what
 * matters at the door: the deposit's state and the code to scan.
 */
export function TicketStub({
  details,
  startsAt,
  deposit,
  state,
  code,
  footnote,
  className,
}: {
  details: EventDetails;
  startsAt?: Date;
  deposit?: bigint;
  state: StubState;
  code?: ReactNode;
  footnote?: ReactNode;
  className?: string;
}) {
  const status = STATUS[state];
  return (
    <div
      className={cn(
        "relative w-full max-w-sm drop-shadow-[0_18px_28px_rgb(0_0_0/0.10)] dark:drop-shadow-[0_18px_28px_rgb(0_0_0/0.5)]",
        className,
      )}
    >
      <div className="ticket rounded-lg border border-line [--notch-y:60%]">
        <div className="px-6 pt-6 pb-7">
          <p className="text-2xs font-medium tracking-[0.14em] text-stamp uppercase">Admit one</p>
          <h3
            className={cn(
              "mt-2 font-display text-[1.65rem] leading-[1.1] font-medium tracking-[-0.02em] text-balance break-words",
              !details.name && "text-ink-3",
            )}
          >
            {details.name || "Your event name"}
          </h3>
          <dl className="mt-4 flex flex-col gap-1.5 text-sm text-ink-2">
            <div className="flex items-center gap-2">
              <dt className="sr-only">When</dt>
              <CalendarDays className="size-4 shrink-0 text-ink-3" />
              <dd>{startsAt && !Number.isNaN(startsAt.getTime()) ? formatWhen(startsAt) : "Date and time"}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Where</dt>
              <MapPin className="size-4 shrink-0 text-ink-3" />
              <dd className={cn("truncate", !details.location && "text-ink-3")}>{details.location || "Location"}</dd>
            </div>
          </dl>
        </div>

        <div className="perforation mx-4" />

        <div className="flex items-end justify-between gap-4 px-6 pt-5 pb-6">
          <div className="min-w-0">
            <p className="text-xs text-ink-3">{status.label}</p>
            <p className={cn("num mt-0.5 text-3xl", status.tone)}>{deposit !== undefined ? formatUsd(deposit) : "—"}</p>
            {footnote && <div className="mt-2 text-xs text-ink-2">{footnote}</div>}
          </div>
          {code ?? <CodePlaceholder dim={state === "preview"} />}
        </div>
      </div>

      {state === "checkedIn" && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-6 right-5 animate-stamp rounded-sm border-2 border-stamp px-2.5 py-1 font-display text-sm font-bold tracking-[0.08em] text-stamp uppercase opacity-90"
        >
          Showed up
        </div>
      )}
    </div>
  );
}

/** Stand-in for the QR before a ticket exists: a quiet grid so the layout doesn't jump. */
function CodePlaceholder({ dim }: { dim?: boolean }) {
  return (
    <div aria-hidden className={cn("grid size-22 shrink-0 grid-cols-5 gap-1 rounded-sm p-1.5", dim && "opacity-40")}>
      {Array.from({ length: 25 }, (_, i) => (
        <span key={i} className={cn("rounded-[1px]", [0, 2, 4, 6, 8, 12, 14, 17, 19, 20, 22, 24].includes(i) ? "bg-ink-3/60" : "bg-line")} />
      ))}
    </div>
  );
}
