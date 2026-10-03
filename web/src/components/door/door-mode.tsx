"use client";

import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useConnection } from "wagmi";
import { CameraScanner } from "@/components/door/camera-scanner";
import { ScanFeedItem, ScanResultCard } from "@/components/door/scan-result-card";
import { TxProgress } from "@/components/tx-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectPrompt } from "@/components/wallet/require-wallet";
import { eventPhase, type ShwUpEvent } from "@/domain/event";
import { useDoor } from "@/hooks/use-door";
import { useDoorKey } from "@/hooks/use-door-key";
import { useNow } from "@/hooks/use-now";
import { useEvent } from "@/hooks/use-shwup";
import { DOOR_KEY_FUNDING } from "@/lib/door-key";
import { formatUsd } from "@/lib/money";
import { formatTime, relative } from "@/lib/time";

export function DoorMode({ id }: { id: bigint }) {
  const { address, status } = useConnection();
  const { event, isLoading, error } = useEvent(id, { live: true });

  if (isLoading || status === "reconnecting") return <Skeleton className="aspect-square max-w-md" />;
  if (error || !event) return <Notice title="Event not found" body="The link may be wrong, or the event is on another network." />;
  if (!address) return <ConnectPrompt title="Door mode" body="Connect the organizer wallet to set up this device for check-in." />;
  if (address.toLowerCase() !== event.organizer.toLowerCase()) {
    return <Notice title="Organizer only" body="Door mode checks guests in and refunds deposits, so only the wallet that created this event can run it. Switch wallets to continue." />;
  }
  return <Door event={event} />;
}

function Door({ event }: { event: ShwUpEvent }) {
  const now = useNow(10_000);
  const phase = eventPhase(event, now);
  const doorKey = useDoorKey(event.id);
  const [useWallet, setUseWallet] = useState(false);
  const door = useDoor(event, useWallet ? null : doorKey.key);
  const [manual, setManual] = useState("");
  const latest = door.results[0];
  const setupNeeded = !doorKey.authorized && !useWallet;

  const submitManual = (e: FormEvent) => {
    e.preventDefault();
    if (!manual.trim()) return;
    door.scan(manual.trim());
    setManual("");
  };

  return (
    <div className="mx-auto max-w-5xl animate-rise">
      <div className="flex items-center justify-between gap-4">
        <Link href={`/app/events/${event.id}`} className="inline-flex min-w-0 items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
          <ArrowLeft className="size-4 shrink-0" />
          <span className="truncate">{event.details.name}</span>
        </Link>
        <p className="num shrink-0 text-sm">
          <span className="text-ink">{event.checkedIn}</span>
          <span className="text-ink-3"> / {event.held} here</span>
        </p>
      </div>

      {phase !== "doors" && (
        <div className="mt-5 rounded-md border border-warn/30 bg-warn-soft px-4 py-3 text-sm">
          {phase === "open"
            ? `Check-in opens at ${formatTime(new Date(event.startsAt.getTime() - 3_600_000))} (${relative(new Date(event.startsAt.getTime() - 3_600_000), now)}). You can set up this device now.`
            : "Check-in is closed for this event."}
        </div>
      )}

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          {setupNeeded ? (
            <DoorSetup doorKey={doorKey} onUseWallet={() => setUseWallet(true)} />
          ) : (
            <>
              <CameraScanner onScan={door.scan} paused={door.working} />
              <form onSubmit={submitManual} className="flex gap-2">
                <Input
                  aria-label="Ticket code or link"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Paste a ticket link"
                  className="num text-sm"
                />
                <Button type="submit" variant="secondary" disabled={!manual.trim()}>
                  Check
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {latest ? (
            <ScanResultCard result={latest} deposit={event.deposit} />
          ) : (
            !setupNeeded && (
              <div className="rounded-lg border border-dashed border-line-strong px-5 py-8 text-center">
                <p className="font-medium">Ready to scan</p>
                <p className="mt-1 text-sm text-ink-2">Point the camera at a guest&apos;s ticket. Their {formatUsd(event.deposit)} goes back to them instantly.</p>
              </div>
            )
          )}
          {door.working && <p className="text-sm text-ink-3">Checking…</p>}

          {door.results.length > 1 && (
            <section>
              <h2 className="text-xs font-medium tracking-wide text-ink-3 uppercase">Earlier</h2>
              <ul className="mt-2 divide-y divide-line">
                {door.results.slice(1, 12).map((r) => (
                  <ScanFeedItem key={r.seq} result={r} />
                ))}
              </ul>
            </section>
          )}

          {!setupNeeded && <DoorKeyStatus doorKey={doorKey} usingWallet={useWallet} organizer={event.organizer} />}
        </div>
      </div>
    </div>
  );
}

function DoorSetup({ doorKey, onUseWallet }: { doorKey: ReturnType<typeof useDoorKey>; onUseWallet: () => void }) {
  const tx = doorKey.authorizeTx;
  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <span className="grid size-10 place-items-center rounded-full bg-sunken">
        <KeyRound className="size-5 text-ink-2" />
      </span>
      <h2 className="mt-4 font-display text-xl font-medium tracking-tight">Scan without wallet pop-ups</h2>
      <p className="mt-2 text-sm text-ink-2">
        Make this phone a door key: one approval authorizes it for this event and gives it {formatUsd(DOOR_KEY_FUNDING)} for network
        fees — enough for over a hundred check-ins. It can only check guests in; it can&apos;t move deposits anywhere else.
      </p>
      <Button className="mt-5" block size="lg" loading={tx.busy} onClick={doorKey.authorize}>
        Set up this device
      </Button>
      <TxProgress stage={tx.stage} error={tx.error} result={tx.result} doneLabel="Door key ready" className="mt-3" />
      <button onClick={onUseWallet} className="mt-4 text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline">
        Use my wallet instead (approve each scan)
      </button>
    </section>
  );
}

function DoorKeyStatus({ doorKey, usingWallet, organizer }: { doorKey: ReturnType<typeof useDoorKey>; usingWallet: boolean; organizer: `0x${string}` }) {
  const [returning, setReturning] = useState(false);
  if (usingWallet) return <p className="text-xs text-ink-3">Scanning with your wallet — approve each check-in when prompted.</p>;
  const scansLeft = doorKey.balance !== undefined ? Number(doorKey.balance / 2n / 10n ** 15n) : undefined; // ~$0.002 per check-in

  const giveBack = async () => {
    setReturning(true);
    const ok = await doorKey.returnLeftovers(organizer).catch(() => false);
    setReturning(false);
    if (ok) toast.success("Door key closed", { description: "Leftover gas went back to your wallet." });
    else toast.error("Couldn't return leftover gas", { description: "Try again in a moment." });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-ink-3">
      <span>
        Door key · {doorKey.balance !== undefined ? formatUsd(doorKey.balance) : "…"} for fees
        {scansLeft !== undefined && ` (~${scansLeft} check-ins)`}
      </span>
      <button onClick={giveBack} disabled={returning} className="underline-offset-4 hover:text-ink hover:underline disabled:opacity-50">
        {returning ? "Returning…" : "Done for the night? Return leftover gas"}
      </button>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-md">
      <h1 className="font-display text-2xl font-medium tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-ink-2">{body}</p>
    </div>
  );
}
