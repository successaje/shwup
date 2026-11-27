import { ArrowRight, ArrowUpRight, Trophy } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { CopyAddress, NetworkPill, StampOnView } from "@/components/layout/footer-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import { chain, explorerUrl, shwupAddress } from "@/config/chain";
import { protocolStats } from "@/domain/stats";
import { formatUsd } from "@/lib/money";
import { readAllEvents } from "@/lib/server/read-event";

const REPO = "https://github.com/successaje/shwup";
const WINNERS = "https://dorahacks.io/hackathon/arc-microgrants/winner";
const sourcify = shwupAddress ? `https://repo.sourcify.dev/${chain.id}/${shwupAddress}` : undefined;

type FooterLink = { href: string; label: string; external?: boolean };
const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#uses", label: "Use cases" },
      { href: "/#arc", label: "Why Arc" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Build",
    links: [
      { href: REPO, label: "Source code", external: true },
      ...(shwupAddress && explorerUrl("address", shwupAddress) ? [{ href: explorerUrl("address", shwupAddress)!, label: "Contract", external: true }] : []),
      ...(sourcify ? [{ href: sourcify, label: "Verified source", external: true }] : []),
      { href: "/brand", label: "Brand kit" },
    ],
  },
  {
    title: "Your account",
    links: [
      { href: "/app", label: "Your events" },
      { href: "/app/new", label: "Create an event" },
      { href: "/app/activity", label: "Activity" },
      { href: "/app/settings", label: "Settings" },
    ],
  },
];

/**
 * The back of the ticket. Dark in both themes, a perforated top edge, live numbers from the chain,
 * and a giant wordmark that gets stamped when it scrolls into view.
 */
export function SiteFooter() {
  return (
    <footer className="relative mt-24 bg-night text-night-ink">
      <Perforation />
      <div className="mx-auto max-w-6xl px-4 pt-20 sm:px-6">
        <div className="flex flex-col items-start gap-8 border-b border-night-line pb-14 md:flex-row md:items-end md:justify-between">
          <h2 className="max-w-xl font-display text-4xl font-bold tracking-[-0.03em] text-balance sm:text-5xl">
            Your next event, with everyone who said they&apos;d come.
          </h2>
          <ButtonLink
            href="/app/new"
            size="lg"
            variant="inverse"
            icon={<ArrowRight className="size-4" />}
            className="flex-row-reverse"
          >
            Create an event
          </ButtonLink>
        </div>

        <div className="grid gap-12 py-14 md:grid-cols-[1.3fr_2fr]">
          <div className="flex flex-col gap-5">
            <NetworkPill className="self-start" />
            <Suspense fallback={<StatsSkeleton />}>
              <FooterStats />
            </Suspense>
          </div>
          <nav className="grid grid-cols-2 gap-8 sm:grid-cols-3" aria-label="Footer">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="font-mono text-xs tracking-[0.15em] text-night-ink-2 uppercase">{col.title}</p>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <FooterAnchor {...l} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </div>

      <div className="relative mx-auto max-w-6xl overflow-hidden px-4 sm:px-6" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- the outlined wordmark, scaled to the full width */}
        <img src="/brand/wordmark-paper.svg" alt="" className="w-full opacity-[0.07] select-none" draggable={false} />
        <span className="absolute right-[8%] bottom-[22%] rotate-[-6deg]">
          <StampOnView>
            <span className="block rounded-md border-[0.35vw] border-[#ff6a3d] px-[1.2vw] py-[0.4vw] font-display text-[clamp(1rem,3.4vw,2.8rem)] font-bold tracking-[0.06em] text-[#ff6a3d] lg:border-4">
              SHOWED UP
            </span>
          </StampOnView>
        </span>
      </div>

      <div className="border-t border-night-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 text-xs text-night-ink-2 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>© {new Date().getFullYear()} ShwUp</span>
            <a href={WINNERS} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-night-ink">
              <Trophy className="size-3.5 text-[#e7b04a]" /> Arc Microgrant winner
            </a>
            {shwupAddress && <CopyAddress address={shwupAddress} />}
          </div>
          <ThemeToggle size="sm" className="self-start border-night-line bg-transparent md:self-auto" />
        </div>
      </div>
    </footer>
  );
}

/** For app and event pages: the essentials, one quiet row. */
export function CompactFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Wordmark className="scale-90 text-ink" />
          <Link href="/#faq" className="hover:text-ink">
            Help
          </Link>
          <Link href="/brand" className="hover:text-ink">
            Brand
          </Link>
          <a href={REPO} target="_blank" rel="noreferrer" className="hover:text-ink">
            Source
          </a>
        </div>
        <div className="self-start sm:self-auto">
          <ThemeToggle size="sm" />
        </div>
      </div>
    </footer>
  );
}

function FooterAnchor({ href, label, external }: FooterLink) {
  const cls = "group inline-flex items-center gap-1 text-sm text-night-ink/85 transition-colors hover:text-night-ink";
  const inner: ReactNode = (
    <>
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
        {label}
      </span>
      {external && <ArrowUpRight className="size-3 opacity-60" />}
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

/** Live totals from the contract (server-rendered with the page). Hidden until there's something to show. */
async function FooterStats() {
  const events = await readAllEvents();
  if (!events) return null;
  const s = protocolStats(events);
  if (s.events === 0) return <p className="max-w-xs text-sm text-night-ink-2">Every deposit, refund and check-in settles in USDC on Arc — public, final in under a second.</p>;
  return (
    <dl className="grid grid-cols-3 gap-6">
      <Stat label="Returned at the door" value={formatUsd(s.returnedAtDoor)} />
      <Stat label="Check-ins" value={s.checkIns.toLocaleString("en-US")} />
      <Stat label="Events" value={s.events.toLocaleString("en-US")} />
    </dl>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="font-mono text-2xl text-night-ink">{value}</dd>
      <dt className="mt-1 text-xs text-night-ink-2">{label}</dt>
    </div>
  );
}

function StatsSkeleton() {
  return <div className="h-14 max-w-xs animate-pulse rounded-md bg-night-line/60" />;
}

/** A row of punched holes along the top edge, in the page colour — the ticket's tear line. */
function Perforation() {
  return (
    <div
      aria-hidden
      className="absolute inset-x-0 -top-3 h-6"
      style={{ background: "radial-gradient(circle at 50% 50%, var(--paper) 7px, transparent 7.5px) 0 0 / 28px 24px repeat-x" }}
    />
  );
}
