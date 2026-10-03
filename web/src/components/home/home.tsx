"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { lastSeenHeld } from "@/lib/seen";
import { PhaseLabel } from "@/components/event/phase-label";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectPrompt, useWalletReady } from "@/components/wallet/require-wallet";
import { eventPhase, type ShwUpEvent } from "@/domain/event";
import { guestView, type GuestView } from "@/domain/guest";
import { useMyEvents, type TicketView } from "@/hooks/use-shwup";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/money";
import { formatTime, relative } from "@/lib/time";

const noop = () => () => {};

export function Home() {
  const { address, loading } = useWalletReady();
  const now = useNow(30_000);
  const mine = useMyEvents(address);

  if (loading) return <HomeSkeleton />;
  if (!address) {
    return (
      <div className="flex flex-col gap-12">
        <ConnectPrompt
          title="Your events"
          body="Events you host and spots you've held live with your wallet. Connect it to see them — or start a new event."
        />
        <EmptyPaths />
      </div>
    );
  }
  if (mine.isLoading) return <HomeSkeleton />;

  const going = mine.attending
    .map((a) => ({ ...a, view: guestView(a.event, a.ticket, now) }))
    .filter((a) => a.view.kind !== "invite" && a.view.kind !== "closed")
    .sort((a, b) => sortKey(a.event, now) - sortKey(b.event, now));
  const hosting = [...mine.organized].sort((a, b) => sortKey(a, now) - sortKey(b, now));

  if (going.length === 0 && hosting.length === 0) {
    return (
      <div className="flex flex-col gap-10">
        <Header />
        <EmptyPaths />
      </div>
    );
  }

  return (
    <div className="flex animate-rise flex-col gap-12">
      <Header />
      {going.length > 0 && (
        <Section title="Going">
          {going.map(({ event, ticket, view }) => (
            <GoingRow key={event.id.toString()} event={event} ticket={ticket} view={view} now={now} />
          ))}
        </Section>
      )}
      <Section title="Hosting">
        {hosting.length > 0 ? (
          hosting.map((e) => <HostingRow key={e.id.toString()} event={e} now={now} />)
        ) : (
          <li className="px-4 py-6 text-sm text-ink-2">
            You haven&apos;t hosted anything yet.{" "}
            <Link href="/app/new" className="font-medium text-ink underline underline-offset-4">
              Create an event
            </Link>
          </li>
        )}
      </Section>
    </div>
  );
}

/** Live and upcoming first (soonest first), then past events (most recent first). */
function sortKey(e: ShwUpEvent, now: Date) {
  const ended = e.checkInEndsAt <= now || e.cancelled;
  return ended ? 1e15 - e.startsAt.getTime() : e.startsAt.getTime();
}

function Header() {
  return <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Your events</h1>;
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-medium tracking-wide text-ink-3 uppercase">{title}</h2>
        {action}
      </div>
      <ul className="divide-y divide-line rounded-md border border-line bg-surface">{children}</ul>
    </section>
  );
}

function Row({ href, event, meta, status, dim }: { href: string; event: ShwUpEvent; meta: ReactNode; status: ReactNode; dim?: boolean }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-sunken/40 sm:px-5">
        <DateBlock date={event.startsAt} dim={dim} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium", dim && "text-ink-2")}>{event.details.name}</p>
          <p className="mt-0.5 truncate text-sm text-ink-3">{meta}</p>
        </div>
        <div className="hidden shrink-0 text-right text-sm sm:block">{status}</div>
        <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <div className="-mt-2 px-4 pb-3 pl-[4.75rem] text-sm sm:hidden">{status}</div>
    </li>
  );
}

function DateBlock({ date, dim }: { date: Date; dim?: boolean }) {
  return (
    <div className={cn("flex w-11 shrink-0 flex-col items-center rounded-sm border border-line py-1", dim && "opacity-60")}>
      <span className="text-2xs font-medium tracking-wide text-stamp uppercase">{date.toLocaleString("en-US", { month: "short" })}</span>
      <span className="num text-lg leading-tight">{date.getDate()}</span>
    </div>
  );
}

function GoingRow({ event, view, now }: { event: ShwUpEvent; ticket: TicketView | undefined; view: GuestView; now: Date }) {
  const meta = `${formatTime(event.startsAt)} · ${event.details.location || relative(event.startsAt, now)}`;
  let status: ReactNode;
  switch (view.kind) {
    case "holding":
      status =
        view.phase === "doors" ? (
          <span className="font-medium text-ok">Doors open · show ticket</span>
        ) : (
          <span className="text-ink-2">{formatUsd(event.deposit)} held</span>
        );
      break;
    case "arrived":
      status =
        view.bonus === "claimable" ? (
          <span className="font-medium text-ok">Collect {formatUsd(event.bonusPerAttendee)}</span>
        ) : (
          <span className="text-ink-2">Showed up</span>
        );
      break;
    case "missed":
      status = <span className="text-ink-3">Missed</span>;
      break;
    case "refund":
      status = view.claimable ? <span className="font-medium text-ok">Refund {formatUsd(event.deposit)}</span> : <span className="text-ink-3">Cancelled</span>;
      break;
    default:
      status = null;
  }
  const past = view.kind === "missed" || (view.kind === "arrived" && view.bonus !== "claimable") || (view.kind === "refund" && !view.claimable);
  return <Row href={`/e/${event.id}`} event={event} meta={meta} status={status} dim={past} />;
}

function HostingRow({ event, now }: { event: ShwUpEvent; now: Date }) {
  const phase = eventPhase(event, now);
  const seen = useSyncExternalStore(noop, () => lastSeenHeld(event.id) ?? -1, () => -1);
  const fresh = seen >= 0 && (phase === "open" || phase === "doors") ? event.held - seen : 0;
  const needsSettle = phase === "closed";
  const meta = `${formatTime(event.startsAt)} · ${event.capacity ? `${event.held}/${event.capacity}` : event.held} held${phase === "doors" || phase === "closed" || phase === "settled" ? ` · ${event.checkedIn} came` : ""}`;
  return (
    <Row
      href={`/app/events/${event.id}`}
      event={event}
      meta={meta}
      status={
        needsSettle ? (
          <span className="font-medium text-warn">Settle no-shows</span>
        ) : fresh > 0 ? (
          <span className="font-medium text-ink">
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-stamp align-middle" aria-hidden />
            {fresh} new {fresh === 1 ? "RSVP" : "RSVPs"}
          </span>
        ) : (
          <PhaseLabel phase={phase} />
        )
      }
      dim={phase === "settled" || phase === "cancelled"}
    />
  );
}

function EmptyPaths() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-md border border-line bg-surface p-5">
        <p className="font-medium">Hosting something?</p>
        <p className="mt-1 text-sm text-ink-2">Set a small deposit so RSVPs mean it. People who come get it back at the door.</p>
        <ButtonLink href="/app/new" className="mt-4" size="sm">
          Create an event
        </ButtonLink>
      </div>
      <div className="rounded-md border border-dashed border-line-strong p-5">
        <p className="font-medium">Got an invite?</p>
        <p className="mt-1 text-sm text-ink-2">Open the link the organizer shared. Your ticket shows up here once you hold a spot.</p>
      </div>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy aria-label="Loading your events" className="flex flex-col gap-10">
      <Skeleton className="h-9 w-48" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
