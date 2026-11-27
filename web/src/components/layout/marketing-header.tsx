"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Wordmark } from "@/components/brand";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { isCurrent, MARKETING_NAV } from "@/components/layout/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const subscribeScroll = (cb: () => void) => {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
};

/** True once the page has scrolled past the top — the header gains its frosted background then. */
function useScrolled(threshold = 8) {
  return useSyncExternalStore(subscribeScroll, () => window.scrollY > threshold, () => false);
}

/** Header for marketing pages: transparent over the hero, frosted paper once you scroll. */
export function MarketingHeader() {
  const scrolled = useScrolled();
  const pathname = usePathname();
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled ? "border-line/80 bg-paper/80 backdrop-blur-md" : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Wordmark />
        <nav className="ml-6 hidden items-center gap-1 text-sm md:flex" aria-label="Main">
          {MARKETING_NAV.map((item) => {
            const current = isCurrent(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "relative rounded-sm px-3 py-2 transition-colors after:absolute after:inset-x-3 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-ink after:transition-transform after:duration-300 hover:text-ink hover:after:scale-x-100",
                  current ? "text-ink after:scale-x-100" : "text-ink-2",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {/* Visibility on a wrapper: classes passed into the toggle can't override its own display. */}
          <div className="hidden md:block">
            <ThemeToggle size="sm" />
          </div>
          <ButtonLink href="/app" size="sm" icon={<ArrowRight className="size-3.5" />} className="flex-row-reverse max-md:hidden">
            Open app
          </ButtonLink>
          <MobileMenu
            items={MARKETING_NAV}
            footer={
              <ButtonLink href="/app" size="lg" block icon={<ArrowRight className="size-4" />} className="flex-row-reverse">
                Open app
              </ButtonLink>
            }
          />
        </div>
      </div>
    </header>
  );
}
