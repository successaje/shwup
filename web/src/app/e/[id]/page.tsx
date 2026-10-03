import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GuestPage } from "@/components/guest/guest-page";
import { SiteHeader } from "@/components/layout/site-header";
import { readEventForMetadata } from "@/lib/server/read-event";
import { walletAvailability } from "@/lib/server/wallet-config";
import { formatUsd } from "@/lib/money";
import { formatWhen } from "@/lib/time";

const isId = (id: string) => /^\d{1,20}$/.test(id);

/** Link previews in group chats: the event name, when, and the deposit. */
export async function generateMetadata({ params }: PageProps<"/e/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!isId(id)) return {};
  const event = await readEventForMetadata(BigInt(id));
  if (!event) return { title: "Event" };
  const description = `${formatWhen(event.startsAt)} · ${event.details.location}. Hold your spot with ${formatUsd(event.deposit)} — you get it back at the door.`;
  return { title: event.details.name, description, openGraph: { title: event.details.name, description } };
}

export default async function EventPage({ params }: PageProps<"/e/[id]">) {
  const { id } = await params;
  if (!isId(id)) notFound();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-14">
        <Suspense>
          <GuestPage id={BigInt(id)} wallets={walletAvailability()} />
        </Suspense>
      </main>
    </>
  );
}
