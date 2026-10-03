"use client";

import type { Address } from "viem";
import { TxProgress } from "@/components/tx-progress";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/wallet/account-button";
import { eventPhase, TicketStatus, type ShwUpEvent } from "@/domain/event";
import { shwupContract, useTicket } from "@/hooks/use-shwup";
import { useStagedWrite } from "@/hooks/use-staged-write";
import { shortAddress } from "@/lib/address";
import { formatUsd } from "@/lib/money";

/**
 * When the organizer scans a guest's ticket with their phone's normal camera, the link opens here.
 * Offer the check-in right on this page — door mode without opening door mode.
 */
export function DoorCheckInBanner({ event, holder, onDone }: { event: ShwUpEvent; holder: Address; onDone: () => void }) {
  const { ticket } = useTicket(event.id, holder, { live: true });
  const tx = useStagedWrite();
  const phase = eventPhase(event);

  const checkIn = async () => {
    const r = await tx.run({ ...shwupContract, functionName: "checkIn", args: [event.id, holder] });
    if (r.ok) onDone();
  };

  let message: string;
  let canCheckIn = false;
  if (!ticket) message = "Looking up this ticket…";
  else if (ticket.status === TicketStatus.CheckedIn) message = "Already checked in.";
  else if (ticket.status !== TicketStatus.Held) message = "This wallet doesn't hold a spot.";
  else if (phase !== "doors") message = phase === "open" ? "Check-in opens an hour before the start." : "Check-in is closed.";
  else {
    message = `Refunds ${formatUsd(event.deposit)} to them instantly.`;
    canCheckIn = true;
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-lg border border-ink/15 bg-surface p-4 lg:mx-0">
      <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">Scanned ticket</p>
      <div className="mt-3 flex items-center gap-3">
        <Avatar address={holder} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="num text-sm">{shortAddress(holder)}</p>
          <p className="text-xs text-ink-2">{message}</p>
        </div>
        {canCheckIn && tx.stage !== "done" && (
          <Button size="sm" loading={tx.busy} onClick={checkIn}>
            Check in
          </Button>
        )}
      </div>
      <TxProgress stage={tx.stage} error={tx.error} result={tx.result} doneLabel="Checked in" className="mt-3" />
    </div>
  );
}
