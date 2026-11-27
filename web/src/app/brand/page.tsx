import { Download } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CopyHex, StampDemo } from "@/components/brand/brand-client";
import { Footer } from "@/components/landing/sections";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { buttonClass } from "@/components/ui/button";
import { LOGOS, PALETTE } from "@/domain/brand";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Brand",
  description: "The ShwUp logo, colours, type, motion and voice — with files to download.",
};

const KIT = "/brand/shwup-brand-kit.zip";

export default function BrandPage() {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 sm:px-6">
        <header className="max-w-3xl pt-14 pb-16 sm:pt-20">
          <p className="font-mono text-xs tracking-[0.2em] text-stamp">BRAND</p>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.03em] text-balance sm:text-5xl">A ticket stub, torn at the door.</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">
            Everything in ShwUp comes from one object people already understand: a ticket that&apos;s held, then stamped
            when you walk in. Use these files and rules when you write or design anything about ShwUp.
          </p>
          <a href={KIT} download className={cn(buttonClass({ size: "lg" }), "mt-8")}>
            <Download className="size-4" /> Download the brand kit
          </a>
          <p className="mt-3 text-xs text-ink-3">SVG and PNG · logos, mark, app icon · 270 KB</p>
        </header>

        <Section id="logo" eyebrow="01" title="Logo" lede="The mark is a ticket stub with a perforation punched through it. Pair it with the wordmark; use the mark alone only where space is tight.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOGOS.map((l) => (
              <figure key={l.file} className="overflow-hidden rounded-lg border border-line bg-surface">
                <div
                  className={cn(
                    "grid aspect-[4/3] place-items-center p-8",
                    l.bg === "ink" ? "bg-[#121110]" : "bg-[#f4f1e8]",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static brand SVGs, shown as-is */}
                  <img src={`/brand/${l.file}.svg`} alt={l.label} className="max-h-24 w-auto max-w-full" />
                </div>
                <figcaption className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium">{l.label}</span>
                    <span className="block text-xs text-ink-3">{l.note}</span>
                  </span>
                  <span className="flex gap-2 text-xs">
                    <a href={`/brand/${l.file}.svg`} download className="font-medium text-ink-2 hover:text-ink">
                      SVG
                    </a>
                    <a href={`/brand/png/${l.file}.png`} download className="font-medium text-ink-2 hover:text-ink">
                      PNG
                    </a>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Rule title="Clear space">
              Keep empty space around the logo equal to half the stub&apos;s height on every side. Nothing — text, edges, other
              logos — goes inside it.
            </Rule>
            <Rule title="Minimum size">
              The lockup stays at least 20 px tall on screens and 6 mm in print. Below that, use the mark alone (16 px
              minimum).
            </Rule>
            <Rule title="Colour">
              Stamp-red mark with ink or paper type. Use a single-colour version only where colour isn&apos;t available.
            </Rule>
            <Rule title="Please don't">
              Recolour the mark, stretch or rotate it, add shadows or outlines, separate the perforation, or set it on a busy
              photo without a solid panel behind it.
            </Rule>
          </div>
        </Section>

        <Section id="colour" eyebrow="02" title="Colour" lede="Warm paper, ink type, one stamp-red accent used sparingly — and green reserved for exactly one meaning: money coming back to you.">
          <div className="overflow-hidden rounded-lg border border-line">
            <div className="hidden grid-cols-[1.2fr_1fr_1fr_2fr] border-b border-line bg-sunken/50 px-4 py-2.5 text-xs font-medium text-ink-3 md:grid">
              <span>Token</span>
              <span>Light</span>
              <span>Dark</span>
              <span>Use</span>
            </div>
            {PALETTE.map((s) => (
              <div key={s.token} className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-line px-4 py-3 last:border-0 md:grid-cols-[1.2fr_1fr_1fr_2fr] md:items-center">
                <span className="col-span-2 font-mono text-sm md:col-span-1">--{s.token}</span>
                <Chip hex={s.light} />
                <Chip hex={s.dark} />
                <span className="col-span-2 text-sm text-ink-2 md:col-span-1">{s.role}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" eyebrow="03" title="Type" lede="Three families, each with one job.">
          <div className="grid gap-4 lg:grid-cols-3">
            <Specimen family="Bricolage Grotesque" use="Display — headlines, the wordmark, big numbers on tickets">
              <p className="font-display text-5xl font-bold leading-none tracking-[-0.035em]">Commit. Show up.</p>
            </Specimen>
            <Specimen family="Geist" use="Interface and reading text">
              <p className="text-lg leading-relaxed">You get your deposit back the moment you&apos;re checked in at the door.</p>
            </Specimen>
            <Specimen family="Geist Mono" use="Money, codes and addresses — anything people compare digit by digit">
              <p className="font-mono">
                <span className="block text-4xl text-ok">$5.00</span>
                <span className="mt-2 block text-sm text-ink-2">0x8c0D…673C · final in 0.4s</span>
              </p>
            </Specimen>
          </div>
        </Section>

        <Section id="motion" eyebrow="04" title="Motion" lede="Few animations, each with a meaning. Quick in, gentle out, and nothing moves for people who ask the system for reduced motion.">
          <div className="grid gap-10 md:grid-cols-[auto_1fr] md:items-start">
            <StampDemo />
            <dl className="grid gap-px overflow-hidden rounded-lg border border-line bg-line text-sm sm:grid-cols-2">
              <Token name="The stamp" value="420 ms · overshoot">Lands with a little weight when someone is checked in. Used for that moment only.</Token>
              <Token name="Rise" value="320 ms · ease-out">How new content arrives: a short lift and fade.</Token>
              <Token name="Count-up" value="600 ms">Money returning to a wallet counts up to its value.</Token>
              <Token name="Fade" value="200 ms">Menus, toasts, small state changes.</Token>
            </dl>
          </div>
        </Section>

        <Section id="voice" eyebrow="05" title="Voice" lede="Plain, warm, specific, a little dry. Numbers over adjectives. No crypto jargon on screens guests see.">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["Your $5 comes back the moment you're scanned in.", "Leverage trustless on-chain escrow for seamless refunds."],
              ["Final on Arc in 0.4s.", "Lightning-fast blockchain settlement!"],
              ["Can't make it? Pass your spot to someone else.", "Transfer your NFT ticket via the secondary market."],
              ["Nobody holds the money but the contract.", "100% secure and safe, guaranteed."],
            ].map(([good, bad]) => (
              <div key={good} className="rounded-lg border border-line bg-surface p-5 text-sm">
                <p>
                  <span className="mr-2 font-mono text-xs text-ok">SAY</span>
                  {good}
                </p>
                <p className="mt-3 text-ink-3">
                  <span className="mr-2 font-mono text-xs text-danger">NOT</span>
                  <span className="line-through decoration-ink-3/50">{bad}</span>
                </p>
              </div>
            ))}
          </div>
        </Section>
      </main>
      <Footer />
    </>
  );
}

function Section({ id, eyebrow, title, lede, children }: { id: string; eyebrow: string; title: string; lede: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-line py-16">
      <div className="mb-10 grid gap-3 md:grid-cols-[1fr_2fr] md:gap-10">
        <div>
          <p className="font-mono text-xs text-ink-3">{eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-tight">{title}</h2>
        </div>
        <p className="max-w-2xl leading-relaxed text-ink-2 md:pt-6">{lede}</p>
      </div>
      {children}
    </section>
  );
}

function Rule({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-stamp pl-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

function Chip({ hex }: { hex: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="size-6 shrink-0 rounded-sm border border-line-strong" style={{ background: hex }} aria-hidden />
      <CopyHex value={hex} />
    </span>
  );
}

function Specimen({ family, use, children }: { family: string; use: string; children: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-8 rounded-lg border border-line bg-surface p-6">
      {children}
      <div>
        <p className="font-medium">{family}</p>
        <p className="mt-1 text-sm text-ink-2">{use}</p>
      </div>
    </div>
  );
}

function Token({ name, value, children }: { name: string; value: string; children: ReactNode }) {
  return (
    <div className="bg-surface p-5">
      <dt className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{name}</span>
        <span className="font-mono text-xs text-ink-3">{value}</span>
      </dt>
      <dd className="mt-1.5 text-ink-2">{children}</dd>
    </div>
  );
}
