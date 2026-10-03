"use client";

import { ArrowLeft, Eye, Pencil, Repeat, ScanLine } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useConnection } from "wagmi";
import { PhaseLabel } from "@/components/event/phase-label";
import { AttendeeList } from "@/components/organizer/attendee-list";
import { EditDetailsDialog } from "@/components/organizer/edit-details-dialog";
import { CancelEventCard, SettleCard } from "@/components/organizer/lifecycle-cards";
import { SharePanel } from "@/components/organizer/share-panel";
import { LoadError } from "@/components/load-error";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectPrompt } from "@/components/wallet/require-wallet";
import { eventPhase, noShows, type ShwUpEvent } from "@/domain/event";
import { useEvent } from "@/hooks/use-shwup";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/money";
import { formatWhen, relative } from "@/lib/time";

export function OrganizerConsole({ id }: { id: bigint }) {
  const now = useNow();
  const { address, status } = useConnection();
  const { event, isLoading, error, refetch } = useEvent(id, { live: true });
  const justCreated = useSearchParams().get("created") === "1";
  const [editing, setEditing] = useState(false);

  if (isLoading || status === "reconnecting") return <ConsoleSkeleton />;
  if (error || !event) return <LoadError error={error} onRetry={() => refetch()} />;

  if (!address) {
    return (
      <ConnectPrompt
        title={event.details.name}
        body="Connect the wallet that created this event to manage it."
      />
    );
  }

  if (address.toLowerCase() !== event.organizer.toLowerCase()) {
    return (
      <div className="flex max-w-md flex-col items-start gap-4">
        <h1 className="font-display text-2xl font-medium tracking-tight">This isn&apos;t your event</h1>
        <p className="text-sm text-ink-2">Only the wallet that created it can manage it. You can still view it as a guest.</p>
        <ButtonLink href={`/e/${id}`} variant="secondary">
          Open guest page
        </ButtonLink>
      </div>
    );
  }

  const phase = eventPhase(event, now);

  return (
    <div className="animate-rise">
      <Link href="/app" className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" /> Your events
      </Link>

      <header className="mt-5 flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <PhaseLabel phase={phase} />
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-balance break-words sm:text-4xl">
            {event.details.name}
          </h1>
          <p className="mt-2 text-ink-2">
            {formatWhen(event.startsAt)} <span className="text-ink-3">· {relative(event.startsAt, now)}</span>
            {event.details.location && (
              <span className="mt-0.5 block text-sm text-ink-3 sm:mt-0 sm:inline sm:text-base">
                <span className="max-sm:hidden"> · </span>
                {event.details.location}
              </span>
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {(phase === "open" || phase === "doors") && (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
                <Pencil className="size-3.5" /> Edit details
              </button>
            )}
            <Link href={`/app/new?from=${id}`} className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
              <Repeat className="size-3.5" /> Run it again
            </Link>
            <Link href={`/e/${id}`} className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
              <Eye className="size-3.5" /> Guest view
            </Link>
          </div>
        </div>
        {(phase === "doors" || phase === "open") && (
          <ButtonLink
            href={`/app/events/${id}/door`}
            variant={phase === "doors" ? "primary" : "secondary"}
            size="lg"
            icon={<ScanLine className="size-4.5" />}
            className="shrink-0"
          >
            {phase === "doors" ? "Open door mode" : "Set up door mode"}
          </ButtonLink>
        )}
      </header>

      {justCreated && (phase === "open" || phase === "doors") && (
        <div className="mt-6 flex animate-rise flex-col gap-1 rounded-md border border-ok/25 bg-ok-soft px-4 py-3 text-sm">
          <p className="font-medium text-ok">Your event is live.</p>
          <p className="text-ink-2">Share the link below. Guests hold their spot from it with a {formatUsd(event.deposit)} deposit.</p>
        </div>
      )}

      <Stats event={event} phase={phase} className="mt-8" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <AttendeeList event={event} phase={phase} onChange={refetch} />
        </div>
        {/* On phones the invite/settle actions come before the guest list: they're the job to do. */}
        <aside className="flex flex-col gap-6 max-lg:order-first">
          {phase !== "cancelled" && phase !== "settled" && <SharePanel event={event} />}
          {(phase === "closed" || phase === "settled") && <SettleCard event={event} phase={phase} onSettled={refetch} />}
          {phase === "open" && event.checkedIn === 0 && <CancelEventCard event={event} onCancelled={refetch} />}
        </aside>
      </div>
      {editing && <EditDetailsDialog key={event.details.name} event={event} open={editing} onOpenChange={setEditing} />}
    </div>
  );
}

function Stats({ event, phase, className }: { event: ShwUpEvent; phase: ReturnType<typeof eventPhase>; className?: string }) {
  const waiting = noShows(event);
  const items =
    phase === "settled"
      ? [
          { label: "Showed up", value: String(event.checkedIn) },
          { label: "No-shows", value: String(waiting) },
          { label: "Forfeited", value: formatUsd(BigInt(waiting) * event.deposit) },
        ]
      : [
          { label: "Spots held", value: event.capacity ? `${event.held}/${event.capacity}` : String(event.held) },
          { label: phase === "open" ? "Deposit" : "Checked in", value: phase === "open" ? formatUsd(event.deposit) : String(event.checkedIn) },
          { label: phase === "open" ? "Held in contract" : "Still to arrive", value: phase === "open" ? formatUsd(BigInt(event.held) * event.deposit) : String(waiting) },
        ];

  return (
    <dl className={cn("grid grid-cols-3 divide-x divide-line rounded-md border border-line bg-surface", className)}>
      {items.map((s) => (
        <div key={s.label} className="px-4 py-4 sm:px-5">
          <dt className="text-xs text-ink-3">{s.label}</dt>
          <dd className="num mt-1 text-xl sm:text-2xl">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ConsoleSkeleton() {
  return (
    <div aria-busy aria-label="Loading event">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-7 h-4 w-28" />
      <Skeleton className="mt-3 h-10 w-2/3" />
      <Skeleton className="mt-3 h-5 w-1/2" />
      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
