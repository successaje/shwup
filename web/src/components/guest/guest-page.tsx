"use client";

import { ArrowUpRight, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress } from "viem";
import { useConnection } from "wagmi";
import { TicketStub } from "@/components/event/ticket-stub";
import { ArrivalBanner } from "@/components/guest/arrival-banner";
import { DoorCheckInBanner } from "@/components/guest/door-check-in-banner";
import { GuestActions } from "@/components/guest/guest-actions";
import { WhosGoing } from "@/components/guest/whos-going";
import { OrganizerRecord } from "@/components/guest/organizer-record";
import { Linkified } from "@/components/linkified";
import { mapsUrl } from "@/domain/calendar";
import { LoadError } from "@/components/load-error";
import { QrCode } from "@/components/qr-code";
import { Skeleton } from "@/components/ui/skeleton";
import { explorerUrl } from "@/config/chain";
import { forfeitRecipient, TicketStatus, type ShwUpEvent } from "@/domain/event";
import { guestView, offerFor, stubState } from "@/domain/guest";
import { ticketUrl } from "@/domain/ticket-code";
import { useCheckInReceipt } from "@/hooks/use-check-in-receipt";
import { useNow } from "@/hooks/use-now";
import { useOrigin } from "@/hooks/use-origin";
import { useEvent, useMyName, useOffers, useTicket } from "@/hooks/use-shwup";
import { shortAddress } from "@/lib/address";
import { formatUsd } from "@/lib/money";
import { formatWhen } from "@/lib/time";

export function GuestPage({ id }: { id: bigint }) {
  const now = useNow(5_000);
  const origin = useOrigin();
  const { address } = useConnection();
  const { event, isLoading, error, refetch: refetchEvent } = useEvent(id, { live: true });
  const { ticket, refetch: refetchTicket, isLoading: ticketLoading } = useTicket(id, address, { live: true });
  const { offers, refetch: refetchOffers } = useOffers(id, { live: true });
  // A ticket QR scanned with a phone camera lands here with ?ticket=<holder>.
  const scannedParam = useSearchParams().get("ticket");
  const scannedHolder = scannedParam && isAddress(scannedParam) ? getAddress(scannedParam) : undefined;

  // Detect the Held → CheckedIn flip while this page is open: that's the moment.
  const previous = useRef<TicketStatus | undefined>(undefined);
  const [arrivedLive, setArrivedLive] = useState(false);
  useEffect(() => {
    const status = ticket?.status;
    if (previous.current === TicketStatus.Held && status === TicketStatus.CheckedIn) {
      setArrivedLive(true);
      navigator.vibrate?.([30, 40, 60]);
    }
    previous.current = status;
  }, [ticket?.status]);

  const { name: myName } = useMyName(address);
  const view = event ? guestView(event, address ? ticket : undefined, now, offerFor(offers, address)) : undefined;
  const receipt = useCheckInReceipt(id, address, view?.kind === "arrived");

  if (isLoading) return <GuestSkeleton />;
  if (error || !event || !view) return <LoadError error={error} onRetry={() => refetchEvent()} backHref="/" />;

  const refresh = () => {
    refetchEvent();
    refetchTicket();
    refetchOffers();
  };
  const isOrganizer = address?.toLowerCase() === event.organizer.toLowerCase();
  const showCode = view.kind === "holding" && address && origin;
  const receiptLink = receipt.data ? explorerUrl("tx", receipt.data.hash) : undefined;

  return (
    <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex min-w-0 flex-col gap-8 lg:order-last">
        {isOrganizer && !scannedHolder && (
          <Link
            href={`/app/events/${id}`}
            className="mx-auto flex w-full max-w-sm items-center justify-between rounded-md border border-line bg-surface px-4 py-3 text-sm hover:border-ink-3 lg:mx-0"
          >
            <span className="text-ink-2">You organize this event</span>
            <span className="font-medium">Manage →</span>
          </Link>
        )}
        {isOrganizer && scannedHolder && <DoorCheckInBanner event={event} holder={scannedHolder} onDone={refresh} />}
        {arrivedLive && <ArrivalBanner amount={event.deposit} />}

        <TicketStub
          details={event.details}
          startsAt={event.startsAt}
          deposit={event.deposit}
          state={stubState(view)}
          className="mx-auto lg:mx-0"
          code={showCode ? <QrCode value={ticketUrl(origin, id, address)} label="Your ticket code" className="size-24 shrink-0" /> : undefined}
          footnote={
            view.kind === "holding"
              ? myName
                ? `${myName} · ${shortAddress(address!)}`
                : shortAddress(address!)
              : view.kind === "arrived" && view.bonus === "claimed"
                ? `+ ${formatUsd(event.bonusPerAttendee)} from no-shows`
                : view.kind === "arrived" && receiptLink
                ? (
                    <a href={receiptLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 hover:text-ink">
                      Refund receipt <ArrowUpRight className="size-3" />
                    </a>
                  )
                : undefined
          }
        />

        <div className="mx-auto w-full max-w-sm lg:mx-0">
          {address && ticketLoading ? (
            <Skeleton className="h-12" />
          ) : isOrganizer && view.kind === "invite" ? (
            <p className="text-sm text-ink-2">This is what your guests see. They&apos;ll get a “Hold my spot” button here.</p>
          ) : (
            <GuestActions event={event} view={view} onChange={refresh} />
          )}
        </div>
      </div>

      <EventAbout event={event} />
    </div>
  );
}

function EventAbout({ event }: { event: ShwUpEvent }) {
  return (
    <div className="flex min-w-0 flex-col gap-10">
      {/* On phones the ticket above already shows name, time and place. */}
      <header className="max-lg:sr-only">
        <p className="text-sm text-ink-3">{formatWhen(event.startsAt, { zone: true })}</p>
        <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-balance break-words sm:text-4xl">
          {event.details.name}
        </h1>
        {event.details.location && <p className="mt-2 text-ink-2">{event.details.location}</p>}
      </header>

      <div className="flex flex-col gap-4">
        <WhosGoing event={event} />
        {event.details.location && (
          <a
            href={mapsUrl(event.details.location)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-sm text-ink-2 hover:text-ink"
          >
            <MapPin className="size-4 text-ink-3" />
            <span className="underline decoration-line-strong underline-offset-4">Open {event.details.location} in Maps</span>
          </a>
        )}
      </div>

      {event.details.description && (
        <p className="max-w-prose leading-relaxed break-words whitespace-pre-line text-ink-2">
          <Linkified text={event.details.description} />
        </p>
      )}

      <section className="max-w-prose border-t border-line pt-8">
        <h2 className="font-display text-lg font-medium tracking-tight">How the {formatUsd(event.deposit)} works</h2>
        <ol className="mt-4 flex flex-col gap-4 text-sm">
          <Step n={1} title="Hold your spot">
            The deposit sits in a public contract on Arc — not with the organizer.
          </Step>
          <Step n={2} title="Show up">
            You get it back the moment you&apos;re scanned in at the door. No forms, no waiting.
          </Step>
          <Step n={3} title="Or don't">
            If you never arrive, your deposit goes to {forfeitRecipient(event)}. Can&apos;t make it after all? Pass your
            spot to someone else and they pay you back.
          </Step>
        </ol>
        {event.bond > 0n && !event.cancelled && (
          <p className="mt-6 flex items-start gap-2 rounded-md border border-line bg-surface px-3 py-2.5 text-sm">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" />
            <span>
              <span className="font-medium">The host put up {formatUsd(event.bond)}.</span>{" "}
              <span className="text-ink-2">If they cancel, it&apos;s split among everyone holding a spot.</span>
            </span>
          </p>
        )}
        <p className="mt-6 text-xs text-ink-3">
          {event.capacity > 0 ? `${event.held} of ${event.capacity} spots held` : `${event.held} spots held`}
        </p>
        <div className="mt-2">
          <OrganizerRecord event={event} />
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="num grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-xs text-ink-2">{n}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-ink-2">{children}</p>
      </div>
    </li>
  );
}

function GuestSkeleton() {
  return (
    <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_380px]" aria-busy aria-label="Loading event">
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="mt-6 h-32 max-w-prose" />
      </div>
      <Skeleton className="h-80 max-w-sm rounded-lg" />
    </div>
  );
}
