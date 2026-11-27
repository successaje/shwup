"use client";

import * as D from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Wordmark } from "@/components/brand";
import { isCurrent, type NavItem } from "@/components/layout/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

/**
 * Full-height menu for phones. Radix handles focus trapping, Escape and scroll lock; links close it.
 * `footer` holds the primary action (e.g. Open app / New event).
 */
export function MobileMenu({ items, footer, home = "/" }: { items: NavItem[]; footer?: ReactNode; home?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger
        className="-mr-1.5 grid size-10 place-items-center rounded-sm text-ink-2 hover:bg-sunken hover:text-ink md:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </D.Trigger>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] data-[state=open]:animate-fade md:hidden" />
        <D.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-paper shadow-[-24px_0_60px_-30px_rgb(0_0_0/0.4)] focus:outline-none data-[state=open]:animate-sheet md:hidden"
          aria-describedby={undefined}
        >
          <div className="flex h-16 items-center justify-between border-b border-line px-4">
            <D.Title asChild>
              <span>
                <Wordmark href={home} />
              </span>
            </D.Title>
            <D.Close className="-mr-1.5 grid size-10 place-items-center rounded-sm text-ink-2 hover:bg-sunken hover:text-ink" aria-label="Close menu">
              <X className="size-5" />
            </D.Close>
          </div>
          <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-4" aria-label="Main">
            {items.map((item, i) => {
              const current = isCurrent(item, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={current ? "page" : undefined}
                  style={{ animationDelay: `${60 + i * 40}ms` }}
                  className={cn(
                    "animate-rise rounded-md px-3 py-3.5 font-display text-2xl font-medium tracking-tight transition-colors motion-reduce:animate-none",
                    current ? "text-ink" : "text-ink-2 hover:bg-sunken hover:text-ink",
                  )}
                >
                  {current && <span className="mr-2 inline-block size-1.5 -translate-y-1 rounded-full bg-stamp align-middle" aria-hidden />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-4 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
            {footer}
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-3">Theme</span>
              <ThemeToggle size="sm" />
            </div>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
