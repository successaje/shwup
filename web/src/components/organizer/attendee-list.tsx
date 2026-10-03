"use client";

import { Check, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/wallet/account-button";
import { TicketStatus, type EventPhase, type ShwUpEvent } from "@/domain/event";
import { shwupContract, useAttendees, useNames } from "@/hooks/use-shwup";
import { useStagedWrite } from "@/hooks/use-staged-write";
import { shortAddress } from "@/lib/address";
import { guestsCsv } from "@/domain/export";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/money";

const ORDER: Record<TicketStatus, number> = {
  [TicketStatus.Held]: 0,
  [TicketStatus.CheckedIn]: 1,
  [TicketStatus.Released]: 2,
  [TicketStatus.None]: 3,
};

export function AttendeeList({ event, phase, onChange }: { event: ShwUpEvent; phase: EventPhase; onChange: () => void }) {
  const { rows, isLoading, refetch } = useAttendees(event.id, { live: phase === "doors" });
  const { nameFor } = useNames(rows?.map((r) => r.address));
  const tx = useStagedWrite();
  const [pending, setPending] = useState<Address | null>(null);

  const checkIn = async (attendee: Address) => {
    setPending(attendee);
    const r = await tx.run({ ...shwupContract, functionName: "checkIn", args: [event.id, attendee] });
    setPending(null);
    if (r.ok) {
      toast.success(`${nameFor(attendee) ?? shortAddress(attendee)} checked in`, { description: `${formatUsd(event.deposit)} returned to them.` });
      refetch();
      onChange();
    } else if (r.error && r.error.kind !== "rejected") {
      toast.error(r.error.title, { description: r.error.detail });
    }
  };

  const exportCsv = () => {
    const csv = guestsCsv(
      (rows ?? []).map((r) => ({ ...r, name: nameFor(r.address) })),
      { closed: phase === "closed" || phase === "settled" },
    );
    const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href, download: `${event.details.name.replace(/[^\w-]+/g, "-").slice(0, 40) || "guests"}-guests.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  };

  const sorted = rows ? [...rows].sort((a, b) => ORDER[a.status] - ORDER[b.status]) : undefined;
  const active = sorted?.filter((r) => r.status !== TicketStatus.Released) ?? [];
  const released = (sorted?.length ?? 0) - active.length;

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg font-medium tracking-tight">Guests</h2>
        <div className="flex items-center gap-4">
          {released > 0 && <p className="text-xs text-ink-3">{released} cancelled</p>}
          {rows && rows.length > 0 && (
            <button onClick={exportCsv} className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
              <Download className="size-3.5" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : active.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-line-strong px-5 py-10 text-center">
          <p className="font-medium">No one has a spot yet</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-ink-2">
            {phase === "open" || phase === "doors"
              ? "Share the invite link. Each person who holds a spot shows up here."
              : "Nobody held a spot for this event."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-surface">
          {active.map((r) => (
            <li key={r.address} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
              <Avatar address={r.address} className="size-7" />
              <span className="min-w-0 flex-1">
                {nameFor(r.address) ? (
                  <>
                    <span className="block truncate text-sm font-medium">{nameFor(r.address)}</span>
                    <span className="num block truncate text-xs text-ink-3">{shortAddress(r.address)}</span>
                  </>
                ) : (
                  <span className="num block truncate text-sm">{shortAddress(r.address)}</span>
                )}
              </span>
              <StatusText status={r.status} phase={phase} />
              {phase === "doors" && r.status === TicketStatus.Held && (
                <Button
                  size="sm"
                  variant="secondary"
                  loading={pending === r.address}
                  disabled={pending !== null}
                  onClick={() => checkIn(r.address)}
                >
                  Check in
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {phase === "doors" && active.length > 0 && (
        <p className="mt-3 text-xs text-ink-3">Phone won&apos;t scan? Check people in by hand here.</p>
      )}
    </section>
  );
}

function StatusText({ status, phase }: { status: TicketStatus; phase: EventPhase }) {
  if (status === TicketStatus.CheckedIn) {
    return (
      <span className="flex items-center gap-1 text-sm text-ok">
        <Check className="size-4" /> Here
      </span>
    );
  }
  const noShow = phase === "closed" || phase === "settled";
  return <span className={cn("text-sm", noShow ? "text-ink-3" : "text-ink-2")}>{noShow ? "No-show" : phase === "cancelled" ? "Refund owed" : "Holding"}</span>;
}
