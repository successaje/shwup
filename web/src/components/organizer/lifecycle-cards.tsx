"use client";

import { useState } from "react";
import { TxProgress } from "@/components/tx-progress";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ForfeitPolicy, forfeitRecipient, noShows, type EventPhase, type ShwUpEvent } from "@/domain/event";
import { shwupContract } from "@/hooks/use-shwup";
import { useStagedWrite } from "@/hooks/use-staged-write";
import { formatUsd } from "@/lib/money";

/** After check-in closes: explain exactly where no-show deposits go, then pay them out. */
export function SettleCard({ event, phase, onSettled }: { event: ShwUpEvent; phase: EventPhase; onSettled: () => void }) {
  const tx = useStagedWrite();
  const missing = noShows(event);
  const forfeited = BigInt(missing) * event.deposit;
  const split = event.forfeitPolicy === ForfeitPolicy.Attendees && event.checkedIn > 0;
  const each = split ? forfeited / BigInt(event.checkedIn) : 0n;
  // Organizer, or the people who came when nobody did: the contract pays the organizer in both cases.
  const recipient = event.forfeitPolicy === ForfeitPolicy.Beneficiary ? forfeitRecipient(event) : "you to collect";
  const bondBack = event.bond > 0n ? ` Your ${formatUsd(event.bond)} bond comes back to you to collect.` : "";

  const nobody = event.checkedIn === 0 && event.held > 0;

  if (phase === "settled") {
    return (
      <section className="rounded-md border border-line bg-surface p-5 text-sm">
        <h2 className="font-medium">Settled</h2>
        <p className="mt-1 text-ink-2">
          {nobody
            ? `Nobody was checked in, so every guest can claim their deposit back from their ticket${event.bond > 0n ? ", with an equal share of your bond" : ""}.`
            : missing === 0
            ? "Everyone who held a spot showed up."
            : event.bonusPerAttendee > 0n
              ? `${formatUsd(forfeited)} from ${missing} no-show${missing === 1 ? "" : "s"} was split — ${formatUsd(event.bonusPerAttendee)} for each of the ${event.checkedIn} people who came.`
              : `${formatUsd(forfeited)} from ${missing} no-show${missing === 1 ? "" : "s"} went to ${recipient}.`}
        </p>
      </section>
    );
  }

  const settle = async () => {
    const r = await tx.run({ ...shwupContract, functionName: "settle", args: [event.id] });
    if (r.ok) onSettled();
  };

  return (
    <section className="rounded-md border border-ink/15 bg-surface p-5">
      <h2 className="text-sm font-medium">Check-in has closed</h2>
      <p className="mt-1 text-sm text-ink-2">
        {nobody
          ? `Nobody was checked in, so nothing is forfeited — settling lets every guest claim their deposit back${
              event.bond > 0n ? `, and your ${formatUsd(event.bond)} bond is split among them, as if you'd cancelled` : ""
            }.`
          : missing === 0
          ? `Everyone showed up. Settle to close the event.${bondBack}`
          : split
            ? `${missing} no-show${missing === 1 ? "" : "s"} forfeit ${formatUsd(forfeited)}. Each of the ${event.checkedIn} people who came gets ${formatUsd(each)}.${bondBack}`
            : `${missing} no-show${missing === 1 ? "" : "s"} forfeit ${formatUsd(forfeited)}, for ${recipient}.${bondBack}`}
      </p>
      <Button className="mt-4" block loading={tx.busy} onClick={settle}>
        Settle no-shows
      </Button>
      <TxProgress stage={tx.stage} error={tx.error} result={tx.result} doneLabel="Settled" className="mt-3" />
      <p className="mt-3 text-xs text-ink-3">Anyone can settle once check-in closes, so deposits are never stuck.</p>
    </section>
  );
}

export function CancelEventCard({ event, onCancelled }: { event: ShwUpEvent; onCancelled: () => void }) {
  const [open, setOpen] = useState(false);
  const tx = useStagedWrite();

  const cancel = async () => {
    const r = await tx.run({ ...shwupContract, functionName: "cancelEvent", args: [event.id] });
    if (r.ok) {
      setOpen(false);
      onCancelled();
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="self-start text-sm text-ink-3 underline-offset-4 hover:text-danger hover:underline">
        Cancel event
      </button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!tx.busy) {
            setOpen(o);
            tx.reset();
          }
        }}
        title="Cancel this event?"
        description={
          event.held > 0
            ? `${event.held} ${event.held === 1 ? "person holds" : "people hold"} a spot. Every deposit becomes claimable in full from the event page${
                event.bond > 0n ? `, along with an equal share of your ${formatUsd(event.bond)} bond` : ""
              }.`
            : event.bond > 0n
              ? `Nobody holds a spot yet, so your ${formatUsd(event.bond)} bond comes straight back.`
              : "Nobody holds a spot yet."
        }
      >
        <p className="text-sm text-ink-2">This can&apos;t be undone.</p>
        <TxProgress stage={tx.stage} error={tx.error} result={tx.result} className="mt-4" />
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={tx.busy}>
            Keep event
          </Button>
          <Button variant="danger" loading={tx.busy} onClick={cancel}>
            Cancel event
          </Button>
        </div>
      </Dialog>
    </>
  );
}
