"use client";

import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, CalendarCheck, CircleSlash, Clock, Gift, RotateCcw } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { CollectCredits } from "@/components/collect-credits";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectPrompt, useWalletReady } from "@/components/wallet/require-wallet";
import { guestActivity, guestTotals, showUpRecord, type ActivityItem, type ActivityKind } from "@/domain/activity";
import { eventPhase, type ShwUpEvent } from "@/domain/event";
import { useMyEvents, type TicketView } from "@/hooks/use-shwup";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/money";

const KIND: Record<
  ActivityKind,
  { icon: typeof Clock; text: (name: string) => ReactNode; tone: string; sign: "+" | "−" | "" }
> = {
  holding: {
    icon: Clock,
    text: (n) => (
      <>
        Deposit held for <b>{n}</b>
      </>
    ),
    tone: "text-ink-2",
    sign: "",
  },
  returned: {
    icon: ArrowDownLeft,
    text: (n) => (
      <>
        Got your deposit back at <b>{n}</b>
      </>
    ),
    tone: "text-ok",
    sign: "+",
  },
  refunded: {
    icon: RotateCcw,
    text: (n) => (
      <>
        Refunded after cancelling <b>{n}</b>
      </>
    ),
    tone: "text-ink-2",
    sign: "+",
  },
  handedOver: {
    icon: ArrowRightLeft,
    text: (n) => (
      <>
        Passed your spot at <b>{n}</b> to someone else
      </>
    ),
    tone: "text-ink-2",
    sign: "+",
  },
  refundOwed: {
    icon: RotateCcw,
    text: (n) => (
      <>
        <b>{n}</b> was cancelled — refund waiting
      </>
    ),
    tone: "text-ok",
    sign: "+",
  },
  forfeited: {
    icon: CircleSlash,
    text: (n) => (
      <>
        Missed <b>{n}</b> — deposit forfeited
      </>
    ),
    tone: "text-ink-3",
    sign: "−",
  },
  bonus: {
    icon: Gift,
    text: (n) => (
      <>
        Your share of no-shows at <b>{n}</b>
      </>
    ),
    tone: "text-ok",
    sign: "+",
  },
  bonusOwed: {
    icon: Gift,
    text: (n) => (
      <>
        Share of no-shows at <b>{n}</b> — ready to collect
      </>
    ),
    tone: "text-ok",
    sign: "+",
  },
  hosted: {
    icon: CalendarCheck,
    text: (n) => (
      <>
        Hosted <b>{n}</b>
      </>
    ),
    tone: "text-ink-2",
    sign: "",
  },
};

export function Activity() {
  const { address, loading } = useWalletReady();
  const now = useNow(60_000);
  const mine = useMyEvents(address);

  if (loading || (address && mine.isLoading)) return <ActivitySkeleton />;
  if (!address)
    return (
      <ConnectPrompt
        title="Activity"
        body="Every deposit you've held, got back, forfeited or earned — connect your wallet to see yours."
      />
    );

  const withTickets = mine.attending.filter((a): a is { event: ShwUpEvent; ticket: TicketView } => !!a.ticket);
  const guestItems = withTickets.flatMap(({ event, ticket }) => guestActivity(event, ticket, now));
  const hostItems: ActivityItem[] = mine.organized.map((e) => ({
    key: `${e.id}-hosted`,
    kind: "hosted",
    event: e,
    amount: 0n,
    at: e.startsAt,
  }));
  const items = [...guestItems, ...hostItems].sort((a, b) => b.at.getTime() - a.at.getTime());
  const totals = guestTotals(guestItems);
  const record = showUpRecord(withTickets, now);

  if (items.length === 0) {
    return (
      <div className="flex max-w-md flex-col items-start gap-4">
        <h1 className="font-display text-3xl font-medium tracking-tight">Activity</h1>
        <p className="text-ink-2">
          Nothing yet. Hold a spot at an event or host one, and every dollar in and out shows up here.
        </p>
        <ButtonLink href="/app/new" variant="secondary">
          Host an event
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="animate-rise flex flex-col gap-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Activity</h1>
        {hostItems.length > 0 && guestItems.length === 0 && (
          <p className="text-ink-2 text-sm">
            {hostItems.length} {hostItems.length === 1 ? "event" : "events"} hosted ·{" "}
            <span className="num text-ink">{mine.organized.reduce((a, e) => a + e.checkedIn, 0)}</span> guests checked
            in so far
          </p>
        )}
        {record.decided > 0 && (
          <p className="text-ink-2 text-sm">
            You showed up to <span className="num text-ink">{record.attended}</span> of{" "}
            <span className="num text-ink">{record.decided}</span> {record.decided === 1 ? "event" : "events"} you held
            a spot for.
          </p>
        )}
      </header>

      <CollectCredits
        account={address}
        self
        title="Money waiting for you"
        description="Your share from settled events — no-show deposits or your bond — plus anything the contract couldn't send straight to your wallet."
      />

      {guestItems.length > 0 && (
        <dl className="border-line bg-line grid grid-cols-2 gap-px overflow-hidden rounded-md border sm:grid-cols-4">
          <Tile label="Held right now" value={formatUsd(totals.held)} />
          <Tile label="Returned to you" value={formatUsd(totals.returned)} />
          <Tile
            label="Earned from no-shows"
            value={formatUsd(totals.earned)}
            tone={totals.earned > 0n ? "text-ok" : undefined}
          />
          <Tile label="Forfeited" value={formatUsd(totals.forfeited)} />
        </dl>
      )}

      {totals.owed > 0n && (
        <p className="border-ok/25 bg-ok-soft rounded-md border px-4 py-3 text-sm">
          <span className="text-ok font-medium">{formatUsd(totals.owed)} is waiting for you.</span>{" "}
          <span className="text-ink-2">Open the event below to collect it.</span>
        </p>
      )}

      <ol className="divide-line border-line bg-surface divide-y rounded-md border">
        {items.map((item) => (
          <Row key={item.key} item={item} now={now} />
        ))}
      </ol>
    </div>
  );
}

function Row({ item, now }: { item: ActivityItem; now: Date }) {
  const k = KIND[item.kind];
  const Icon = k.icon;
  const href = item.kind === "hosted" ? `/app/events/${item.event.id}` : `/e/${item.event.id}`;
  const hostedMeta =
    item.kind === "hosted"
      ? eventPhase(item.event, now) === "cancelled"
        ? "Cancelled"
        : now >= item.event.checkInEndsAt
          ? `${item.event.checkedIn} of ${item.event.held} came`
          : `${item.event.held} holding a spot`
      : null;
  return (
    <li>
      <Link href={href} className="hover:bg-sunken/40 flex items-center gap-4 px-4 py-3.5 transition-colors sm:px-5">
        <span className="bg-sunken grid size-9 shrink-0 place-items-center rounded-full">
          <Icon className={cn("size-4", k.tone === "text-ok" ? "text-ok" : "text-ink-3")} />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-ink-2 [&_b]:text-ink truncate [&_b]:font-medium">{k.text(item.event.details.name)}</p>
          <p className="text-ink-3 mt-0.5 text-xs">
            {item.at.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: item.at.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
            })}
            {hostedMeta && ` · ${hostedMeta}`}
          </p>
        </div>
        {item.amount > 0n && (
          <span className={cn("num shrink-0 text-sm", k.tone)}>
            {k.sign}
            {formatUsd(item.amount)}
          </span>
        )}
        <ArrowUpRight className="text-ink-3 size-3.5 shrink-0" aria-hidden />
      </Link>
    </li>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="bg-surface px-4 py-4">
      <dt className="text-ink-3 text-xs">{label}</dt>
      <dd className={cn("num mt-1 text-xl", tone)}>{value}</dd>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Loading activity">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-20" />
      <Skeleton className="h-64" />
    </div>
  );
}
