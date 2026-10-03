"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { AccountButton } from "@/components/wallet/account-button";
import { chain, chainKey } from "@/config/chain";
import { cn } from "@/lib/cn";

export function AppHeader() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-15 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Wordmark href="/app" />
        {chainKey !== "arc" && (
          <span className="hidden rounded-xs border border-warn/30 bg-warn-soft px-1.5 py-0.5 text-2xs font-medium tracking-wide text-warn uppercase sm:inline">
            {chain.name}
          </span>
        )}
        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <NavLink href="/app" active={path === "/app"}>
            Events
          </NavLink>
          <NavLink href="/app/activity" active={path === "/app/activity"}>
            Activity
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {path !== "/app/new" && (
            <ButtonLink href="/app/new" size="sm" variant="primary" icon={<Plus className="size-4" />} className="max-sm:px-2.5">
              <span className="max-sm:sr-only">New event</span>
            </ButtonLink>
          )}
          <AccountButton />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn("rounded-sm px-2.5 py-1.5 transition-colors", active ? "text-ink" : "text-ink-3 hover:text-ink")}
    >
      {children}
    </Link>
  );
}
