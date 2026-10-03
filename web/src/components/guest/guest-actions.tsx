"use client";

import Link from "next/link";
import { useState } from "react";
import { zeroAddress } from "viem";
import { toast } from "sonner";
import { useBalance, useConnection } from "wagmi";
import { AddToCalendar } from "@/components/guest/add-to-calendar";
import { TxProgress } from "@/components/tx-progress";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { ConnectDialog } from "@/components/wallet/connect-dialog";
import { FundingGuide } from "@/components/wallet/funding-guide";
import { chain, chainKey } from "@/config/chain";
import { forfeitRecipient, type ShwUpEvent } from "@/domain/event";
import type { GuestView } from "@/domain/guest";
import { shwupContract, useMyName } from "@/hooks/use-shwup";
import { validateName } from "@/domain/names";
import { useStagedWrite } from "@/hooks/use-staged-write";
import { formatUsd } from "@/lib/money";
import { formatWhen, relative } from "@/lib/time";

/** The one thing a guest can do right now, plus what it means for their money. */
export function GuestActions({ event, view, onChange }: { event: ShwUpEvent; view: GuestView; onChange: () => void }) {
  switch (view.kind) {
    case "invite":
      return <HoldSpot event={event} view={view} onDone={onChange} />;
    case "holding":
      return <Holding event={event} view={view} onChange={onChange} />;
    case "arrived":
      return <Arrived event={event} bonus={view.bonus} onChange={onChange} />;
    case "missed":
      return (
        <Note title="You didn't make it in">
          Check-in closed before you were scanned, so your {formatUsd(event.deposit)} deposit{" "}
          {view.settled ? "was forfeited" : "will be forfeited when the event is settled"}. It goes to {forfeitRecipient(event)}.
        </Note>
      );
    case "refund":
      return view.claimable ? (
        <ClaimRefund event={event} onDone={onChange} />
      ) : (
        <Note title="Event cancelled">
          Your deposit has been returned
          {event.bondPerGuest > 0n ? `, with ${formatUsd(event.bondPerGuest)} from the host's bond` : ""}.
        </Note>
      );
    case "closed":
      return (
        <Note title={view.phase === "cancelled" ? "This event was cancelled" : "RSVPs are closed"}>
          {view.phase === "cancelled" ? "The organizer called it off." : "Check-in for this event has ended."}
        </Note>
      );
  }
}

function HoldSpot({ event, view, onDone }: { event: ShwUpEvent; view: Extract<GuestView, { kind: "invite" }>; onDone: () => void }) {
  const { address } = useConnection();
  const { data: balance } = useBalance({ address, chainId: chain.id, query: { enabled: !!address } });
  const [connectOpen, setConnectOpen] = useState(false);
  const [fundingOpen, setFundingOpen] = useState(false);
  const tx = useStagedWrite();
  const { name: savedName } = useMyName(address);
  const [draft, setDraft] = useState<string | null>(null); // null = untouched, show the saved name
  const name = (draft ?? savedName).trim();
  const nameError = validateName(name);
  const short = balance !== undefined && balance.value < event.deposit;

  if (view.full) {
    return (
      <Note title="This event is full">
        Every spot is taken. If someone can&apos;t make it and passes their spot on, you can take it here — keep this page
        handy.
      </Note>
    );
  }

  const hold = async () => {
    if (!address) return setConnectOpen(true);
    if (nameError) return;
    const newName = name && name !== savedName ? name : null;
    // Taking someone's spot pays them back, so it comes before opening a new one. Either way it's
    // one transaction, with the name set alongside.
    const r = view.offer
      ? newName
        ? await tx.run({ ...shwupContract, functionName: "takeSpotAs", args: [event.id, view.offer, newName], value: event.deposit })
        : await tx.run({ ...shwupContract, functionName: "takeSpot", args: [event.id, view.offer], value: event.deposit })
      : newName
        ? await tx.run({ ...shwupContract, functionName: "rsvpAs", args: [event.id, newName], value: event.deposit })
        : await tx.run({ ...shwupContract, functionName: "rsvp", args: [event.id], value: event.deposit });
    if (r.ok) {
      toast.success("Your spot is held", {
        description: `Final on Arc in ${(r.finalityMs / 1000).toFixed(1)}s. Bring your ticket to the door.`,
      });
      onDone();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {view.handedOver && <p className="text-sm text-ink-2">You passed your spot on and got your deposit back. Changed your mind? Hold a new one.</p>}
      {view.offer && (
        <p className="text-sm text-ink-2">
          <span className="font-medium text-ink">Someone can&apos;t make it.</span> Take their spot — your deposit goes to them,
          and comes back to you at the door.
        </p>
      )}
      {address && (
        <Field
          label="Your name"
          optional
          error={nameError ?? undefined}
          hint={savedName && draft === null ? "Saved from your last RSVP." : "Shown to the organizer and on the guest list. Public on Arc."}
        >
          {(p) => (
            <Input
              {...p}
              value={draft ?? savedName}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="So the door knows who you are"
              autoComplete="name"
              maxLength={40}
            />
          )}
        </Field>
      )}
      <Button size="lg" block loading={tx.busy} onClick={hold} disabled={short || !!nameError}>
        {view.offer ? "Take this spot" : view.rejoin ? "Hold my spot again" : "Hold my spot"} · {formatUsd(event.deposit)}
      </Button>
      {short && (
        <div className="flex flex-col gap-3 rounded-md border border-warn/30 bg-warn-soft px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-medium">You need {formatUsd(event.deposit)} in USDC on {chain.name}.</span>{" "}
            <span className="text-ink-2">Your wallet has {formatUsd(balance.value)}.</span>
          </p>
          <Button size="sm" variant="secondary" onClick={() => setFundingOpen(true)} className="shrink-0">
            {chainKey === "arcTestnet" ? "Get test USDC" : "Get USDC"}
          </Button>
        </div>
      )}
      <FundingGuide need={event.deposit} open={fundingOpen} onOpenChange={setFundingOpen} />
      <TxProgress stage={tx.stage} error={tx.error} result={tx.result} doneLabel="Spot held" />
      <p className="text-sm text-ink-2">
        You get it back the moment you&apos;re checked in at the door.
        {event.cancelCutoff > new Date() && ` Can't make it? Cancel until ${formatWhen(event.cancelCutoff)} for a full refund.`}
      </p>
      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}

function Holding({ event, view, onChange }: { event: ShwUpEvent; view: Extract<GuestView, { kind: "holding" }>; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const tx = useStagedWrite();
  const offerTx = useStagedWrite();

  const setOffered = async (offer: boolean) => {
    const r = offer
      ? await offerTx.run({ ...shwupContract, functionName: "offerSpot", args: [event.id, zeroAddress] })
      : await offerTx.run({ ...shwupContract, functionName: "withdrawOffer", args: [event.id] });
    if (r.ok) onChange();
  };

  const cancel = async () => {
    const r = await tx.run({ ...shwupContract, functionName: "cancelRsvp", args: [event.id] });
    if (r.ok) {
      setOpen(false);
      onChange();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {view.phase === "doors" ? (
        <div className="flex items-start gap-3 rounded-md border border-ok/25 bg-ok-soft px-4 py-3 text-sm">
          <span className="mt-1.5 size-2 shrink-0 animate-pulse rounded-full bg-ok" aria-hidden />
          <p>
            <span className="font-medium">Doors are open.</span>{" "}
            <span className="text-ink-2">Show this screen at the door. Keep it open — it updates the moment you&apos;re scanned.</span>
          </p>
        </div>
      ) : (
        <p className="text-sm text-ink-2">
          Your spot is held. Bring this ticket {relative(event.startsAt)} — your {formatUsd(event.deposit)} comes back the
          moment you&apos;re scanned in.
        </p>
      )}
      <AddToCalendar event={event} />
      {view.offered && (
        <div className="flex flex-col gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm">
          <p>
            <span className="font-medium">Your spot is up for grabs.</span>{" "}
            <span className="text-ink-2">
              When someone takes it, your {formatUsd(event.deposit)} comes straight back. Until then it&apos;s still yours.
            </span>
          </p>
          <Button size="sm" variant="ghost" className="self-start" loading={offerTx.busy} onClick={() => setOffered(false)}>
            Keep my spot after all
          </Button>
          <TxProgress stage={offerTx.stage} error={offerTx.error} result={offerTx.result} />
        </div>
      )}
      {!view.canCancel && !view.offered && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setOffered(true)}
            disabled={offerTx.busy}
            className="self-start text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline"
          >
            Can&apos;t make it? Pass your spot to someone else
          </button>
          <TxProgress stage={offerTx.stage} error={offerTx.error} result={offerTx.result} />
        </div>
      )}
      {view.canCancel && (
        <>
          <button onClick={() => setOpen(true)} className="self-start text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline">
            Can&apos;t make it? Cancel for a refund
          </button>
          <Dialog
            open={open}
            onOpenChange={(o) => !tx.busy && (setOpen(o), tx.reset())}
            title="Give up your spot?"
            description={`You'll get your ${formatUsd(event.deposit)} back right away, and someone else can take the spot.`}
          >
            <TxProgress stage={tx.stage} error={tx.error} result={tx.result} />
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={tx.busy}>
                Keep my spot
              </Button>
              <Button variant="secondary" loading={tx.busy} onClick={cancel}>
                Cancel and refund {formatUsd(event.deposit)}
              </Button>
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
}

function Arrived({ event, bonus, onChange }: { event: ShwUpEvent; bonus: Extract<GuestView, { kind: "arrived" }>["bonus"]; onChange: () => void }) {
  const tx = useStagedWrite();
  const claim = async () => {
    const r = await tx.run({ ...shwupContract, functionName: "claim", args: [event.id] });
    if (r.ok) onChange();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-2">
        You&apos;re checked in and your {formatUsd(event.deposit)} is back in your wallet. Enjoy it.
      </p>
      {bonus === "pending" && (
        <p className="text-sm text-ink-2">
          If anyone doesn&apos;t show, their deposit is split among everyone here. Come back after check-in closes{" "}
          ({formatWhen(event.checkInEndsAt)}) to collect your share.
        </p>
      )}
      {bonus === "claimable" && (
        <div className="flex flex-col gap-3 rounded-md border border-ok/25 bg-ok-soft p-4">
          <p className="text-sm">
            <span className="font-medium">No-shows paid you.</span>{" "}
            <span className="text-ink-2">Your share of forfeited deposits is {formatUsd(event.bonusPerAttendee)}.</span>
          </p>
          <Button variant="ok" loading={tx.busy} onClick={claim}>
            Collect {formatUsd(event.bonusPerAttendee)}
          </Button>
          <TxProgress stage={tx.stage} error={tx.error} result={tx.result} doneLabel="Collected" />
        </div>
      )}
      {bonus === "claimed" && <p className="text-sm text-ok">You collected {formatUsd(event.bonusPerAttendee)} from no-shows.</p>}
      <Link
        href="/app/new"
        className="mt-2 flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm transition-colors hover:border-ink-3"
      >
        <span>
          <span className="font-medium">Hosting something?</span>{" "}
          <span className="text-ink-2">Get RSVPs that show up, like this one.</span>
        </span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function ClaimRefund({ event, onDone }: { event: ShwUpEvent; onDone: () => void }) {
  const tx = useStagedWrite();
  const claim = async () => {
    const r = await tx.run({ ...shwupContract, functionName: "claim", args: [event.id] });
    if (r.ok) onDone();
  };
  return (
    <div className="flex flex-col gap-4">
      <Note title="This event was cancelled">
        Your full deposit is waiting for you
        {event.bondPerGuest > 0n ? `, plus ${formatUsd(event.bondPerGuest)} from the host's bond for the trouble` : ""}.
      </Note>
      <Button size="lg" block loading={tx.busy} onClick={claim}>
        Get my {formatUsd(event.deposit + event.bondPerGuest)}
      </Button>
      <TxProgress stage={tx.stage} error={tx.error} result={tx.result} doneLabel="Refunded" />
    </div>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-ink-2">{children}</p>
    </div>
  );
}
