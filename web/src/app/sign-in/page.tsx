import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { SignInPanel } from "@/components/auth/sign-in-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { currentUser } from "@/lib/server/auth/http";
import { safeNext } from "@/lib/sign-in-message";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to ShwUp with your wallet. Free, no transaction.",
  robots: { index: false },
};

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const raw = (await searchParams).next;
  const next = safeNext(typeof raw === "string" ? raw : null);
  if (await currentUser()) redirect(next);

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <BrandPanel />
      <main className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between lg:justify-end">
          <span className="lg:hidden">
            <Wordmark />
          </span>
          <ThemeToggle size="sm" />
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <SignInPanel next={next} />
        </div>
        <p className="text-center text-xs text-ink-3">
          New to ShwUp? Signing in creates your account. <Link href="/#faq" className="underline underline-offset-4 hover:text-ink">How it works</Link>
        </p>
      </main>
    </div>
  );
}

/** The night side: the brand, a ticket being admitted, and the promise in one line. */
function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-night p-10 text-night-ink lg:flex lg:flex-col">
      <Wordmark className="text-night-ink" />
      <div className="flex flex-1 flex-col justify-center">
        <div className="relative max-w-sm rotate-[-2deg] rounded-lg bg-night-ink p-6 text-night shadow-[0_30px_60px_-30px_rgb(0_0_0/0.6)]">
          <p className="font-mono text-[0.7rem] tracking-[0.2em] text-[#c2402a]">ADMIT ONE</p>
          <p className="mt-2 font-display text-2xl font-bold tracking-tight">Your ShwUp account</p>
          <div className="mt-5 border-t border-dashed border-night/25 pt-4 text-sm text-night/70">
            Your profile, your events and your record, on any device.
          </div>
          <span className="absolute -right-4 -bottom-5 rotate-[-8deg] animate-stamp rounded-md border-[3px] border-[#ff6a3d] bg-night-ink/80 px-3 py-1 font-display text-lg font-bold tracking-[0.06em] text-[#ff6a3d] motion-reduce:animate-none">
            SHOWED UP
          </span>
        </div>
        <h2 className="mt-16 max-w-md font-display text-4xl font-bold tracking-[-0.03em] text-balance">
          Commit. Show up. Get it back.
        </h2>
        <p className="mt-4 max-w-sm text-night-ink-2">Deposits settle in USDC on Arc. ShwUp never holds your money.</p>
      </div>
      {/* The tear line between the stub and the page. */}
      <div
        aria-hidden
        className="absolute inset-y-0 -right-3 w-6"
        style={{ background: "radial-gradient(circle at 50% 50%, var(--paper) 7px, transparent 7.5px) 0 0 / 24px 28px repeat-y" }}
      />
    </aside>
  );
}
