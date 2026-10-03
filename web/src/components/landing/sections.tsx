import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { HeroDemo } from "@/components/landing/hero-demo";
import { ButtonLink } from "@/components/ui/button";
import { explorerUrl, shwupAddress } from "@/config/chain";

export function LandingNav() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
      <Wordmark />
      <nav className="ml-auto hidden items-center gap-6 text-sm text-ink-2 md:flex">
        <a href="#how" className="hover:text-ink">
          How it works
        </a>
        <a href="#arc" className="hover:text-ink">
          Why it works now
        </a>
        <a href="#faq" className="hover:text-ink">
          Questions
        </a>
      </nav>
      <ButtonLink href="/app" size="sm" variant="secondary" className="max-md:ml-auto">
        Open app
      </ButtonLink>
    </header>
  );
}

export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pt-10 pb-20 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-20 md:pb-28">
      <div>
        <p className="text-sm font-medium text-stamp">Refundable RSVPs, on Arc</p>
        <h1 className="mt-4 font-display text-[2.75rem] leading-[1.02] font-bold tracking-[-0.035em] text-balance sm:text-5xl lg:text-[4.25rem]">
          RSVPs that mean it.
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">
          Guests hold their spot with a $5 deposit. They get it back the second they&apos;re scanned in at the door.
          No-shows don&apos;t.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <ButtonLink href="/app/new" size="lg" icon={<ArrowRight className="size-4" />} className="flex-row-reverse">
            Create an event
          </ButtonLink>
          <ButtonLink href="#how" size="lg" variant="ghost">
            How it works
          </ButtonLink>
        </div>
      </div>
      <HeroDemo />
    </section>
  );
}

export function Problem() {
  return (
    <section className="border-y border-line bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.4fr] md:py-20">
        <h2 className="font-display text-3xl font-medium tracking-tight text-balance">A free RSVP is free to ignore.</h2>
        <div className="flex flex-col gap-4 text-ink-2 md:text-lg md:leading-relaxed">
          <p>
            You book the room and order food for the RSVP list. Half of them don&apos;t come. The people on the waitlist
            who would have come never got a spot.
          </p>
          <p>
            Charging for tickets fixes it, but then the event isn&apos;t free anymore. A deposit you get back fixes it
            without costing anyone who shows up a cent.
          </p>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: "Set a deposit",
    body: "Create the event and pick an amount — $2, $5, $10. Share the link wherever you'd share an RSVP form.",
    detail: "Takes a minute",
  },
  {
    title: "Guests hold a spot",
    body: "They pay the deposit from their wallet. It sits in a public contract, not with you, until the door.",
    detail: "One tap, no approvals",
  },
  {
    title: "Scan them in",
    body: "Door mode turns any phone into a scanner. Each scan returns that guest's deposit, final before they reach the coat check.",
    detail: "No pop-ups at the door",
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-20 sm:px-6 md:py-28">
      <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">How it works</h2>
      <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative border-t border-ink pt-6">
            <span className="num text-sm text-ink-3">0{i + 1}</span>
            <h3 className="mt-3 font-display text-xl font-medium tracking-tight">{s.title}</h3>
            <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
            <p className="mt-4 text-xs font-medium tracking-wide text-stamp uppercase">{s.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function NoShowMath() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 md:pb-28">
      <div className="grid gap-10 rounded-lg border border-line bg-surface p-6 sm:p-10 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div>
          <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Showing up pays.</h2>
          <p className="mt-3 leading-relaxed text-ink-2">
            You choose where no-show deposits go. For meetups, split them among the people who came. For classes and
            appointments, keep them to cover the empty seat.
          </p>
        </div>
        <dl className="num grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line text-sm">
          <Cell label="Spots held" value="40" />
          <Cell label="Deposit" value="$5.00" />
          <Cell label="Showed up" value="32" />
          <Cell label="No-shows forfeit" value="$40.00" />
          <div className="col-span-2 bg-ok-soft px-5 py-4">
            <dt className="font-sans text-xs text-ink-2">Each person who came gets back</dt>
            <dd className="mt-1 text-2xl text-ok">$5.00 + $1.25</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-5 py-4">
      <dt className="font-sans text-xs text-ink-3">{label}</dt>
      <dd className="mt-1 text-xl">{value}</dd>
    </div>
  );
}

export function WhyArc() {
  const contract = shwupAddress ? explorerUrl("address", shwupAddress) : undefined;
  return (
    <section id="arc" className="scroll-mt-8 bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
        <div className="grid gap-12 md:grid-cols-[1fr_1.3fr]">
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
              Deposit RSVPs were tried before. The rails weren&apos;t ready.
            </h2>
            <p className="mt-5 leading-relaxed text-paper/70">
              Earlier attempts ran on chains where the deposit was a volatile token and refunding $5 could cost more than
              $5. Card holds have fixed fees that make small deposits pointless. Arc removes both problems.
            </p>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-md bg-paper/15 sm:grid-cols-2">
            <Fact title="Deposits are dollars">USDC is Arc&apos;s native currency. Holding a spot is one transaction — no token approval, no second coin for gas.</Fact>
            <Fact title="Refunds cost a tenth of a cent">Arc targets about $0.001 per transfer, so a $2 deposit is worth taking and worth returning.</Fact>
            <Fact title="Final in under a second">Arc has deterministic finality. The refund is done before the guest is through the door.</Fact>
            <Fact title="Nobody holds the money">Deposits sit in a public contract. The organizer can&apos;t withdraw them; they only go back to guests or settle as no-shows.</Fact>
          </dl>
        </div>
        {contract && (
          <a href={contract} target="_blank" rel="noreferrer" className="mt-10 inline-flex items-center gap-1 text-sm text-paper/70 hover:text-paper">
            See the contract on the Arc explorer <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </div>
    </section>
  );
}

function Fact({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-ink p-6">
      <dt className="font-medium">{title}</dt>
      <dd className="mt-2 text-sm leading-relaxed text-paper/65">{children}</dd>
    </div>
  );
}

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "What do guests need?",
    a: "A wallet with a few dollars of USDC on Arc — MetaMask, Rabby or any browser wallet works. The deposit is the only cost; network fees are a fraction of a cent.",
  },
  {
    q: "What if I'm running late?",
    a: "Check-in opens an hour before the start and stays open for as long as the organizer chose (three hours by default). Arrive within that window and you get your deposit back.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, until the cancellation cutoff the organizer set — usually 24 hours before. You get the full deposit back immediately.",
  },
  {
    q: "Can the organizer keep my deposit if I came?",
    a: "No. The contract only lets a deposit go back to the guest who paid it, or be forfeited if they never checked in. If the organizer cancels, every deposit is claimable in full.",
  },
  {
    q: "Who runs the door?",
    a: "Anyone the organizer trusts. Door mode authorizes a phone with a single approval, then scans without wallet pop-ups. A phone's normal camera works too.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-8 px-4 py-20 sm:px-6 md:py-28">
      <h2 className="font-display text-3xl font-medium tracking-tight">Questions</h2>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {FAQ.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden className="text-xl leading-none text-ink-3 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 max-w-prose leading-relaxed text-ink-2">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <div className="flex flex-col items-start gap-6 border-t border-ink pt-12 md:flex-row md:items-end md:justify-between">
        <h2 className="max-w-lg font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
          Your next event, with everyone who said they&apos;d come.
        </h2>
        <ButtonLink href="/app/new" size="lg">
          Create an event
        </ButtonLink>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>ShwUp — refundable RSVPs on Arc.</p>
        <div className="flex gap-5">
          <Link href="/app" className="hover:text-ink">
            Your events
          </Link>
          <a href="https://github.com/successaje/shwup" className="hover:text-ink">
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
