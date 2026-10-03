"use client";

import { Check, Copy, History, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useBalance, useConnection, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { ConnectDialog } from "@/components/wallet/connect-dialog";
import { chain } from "@/config/chain";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/money";
import { shortAddress } from "@/lib/address";

const noop = () => () => {};

export function AccountButton({ className }: { className?: string }) {
  const { address, status } = useConnection();
  const [connectOpen, setConnectOpen] = useState(false);
  // Wallet state only exists in the browser; render the placeholder until hydrated so the server
  // HTML and the first client render always agree.
  const hydrated = useSyncExternalStore(noop, () => true, () => false);

  if (!hydrated || status === "reconnecting" || status === "connecting") {
    return <div className={cn("h-9 w-32 animate-pulse rounded-sm bg-sunken", className)} aria-label="Connecting wallet" />;
  }

  if (!address) {
    return (
      <>
        <Button size="sm" variant="secondary" onClick={() => setConnectOpen(true)} className={className}>
          Connect wallet
        </Button>
        <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
      </>
    );
  }

  return <AccountMenu address={address} className={className} />;
}

function AccountMenu({ address, className }: { address: `0x${string}`; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address, chainId: chain.id, query: { refetchInterval: 10_000 } });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Wallet ${shortAddress(address)}`}
        className="flex h-9 items-center gap-2 rounded-sm border border-line-strong bg-surface pr-3 pl-2 text-sm transition-colors hover:border-ink-3"
      >
        <Avatar address={address} />
        {balance && <span className="num hidden text-ink-2 sm:inline">{formatUsd(balance.value)}</span>}
        <span className="num">{shortAddress(address)}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-64 animate-rise rounded-md border border-line bg-surface p-1.5 shadow-[0_16px_32px_-16px_rgb(0_0_0/0.3)]"
        >
          <div className="px-2.5 pt-2 pb-3">
            <p className="text-xs text-ink-3">Balance on {chain.name}</p>
            <p className="num mt-0.5 text-xl">{balance ? formatUsd(balance.value) : "—"}</p>
          </div>
          <MenuLink href="/app/activity" icon={<History className="size-4" />} onNavigate={() => setOpen(false)}>
            Activity
          </MenuLink>
          <MenuLink href="/app/settings" icon={<UserRound className="size-4" />} onNavigate={() => setOpen(false)}>
            Profile & settings
          </MenuLink>
          <MenuItem onClick={copy} icon={copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}>
            {copied ? "Copied" : "Copy address"}
          </MenuItem>
          <MenuItem
            onClick={() => {
              setOpen(false);
              disconnect();
            }}
            icon={<LogOut className="size-4" />}
          >
            Disconnect
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex h-10 w-full items-center gap-2.5 rounded-sm px-2.5 text-sm text-ink-2 hover:bg-sunken hover:text-ink"
    >
      {icon}
      {children}
    </button>
  );
}

function MenuLink({ href, icon, children, onNavigate }: { href: string; icon: React.ReactNode; children: React.ReactNode; onNavigate: () => void }) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onNavigate}
      className="flex h-10 w-full items-center gap-2.5 rounded-sm px-2.5 text-sm text-ink-2 hover:bg-sunken hover:text-ink"
    >
      {icon}
      {children}
    </Link>
  );
}

/** Deterministic two-tone swatch from the address — recognizable without ENS or uploads. */
export function Avatar({ address, className }: { address: string; className?: string }) {
  const h1 = parseInt(address.slice(2, 6), 16) % 360;
  const h2 = (h1 + 40 + (parseInt(address.slice(6, 8), 16) % 80)) % 360;
  return (
    <span
      aria-hidden
      className={cn("size-5 shrink-0 rounded-full", className)}
      style={{ background: `conic-gradient(from 210deg, hsl(${h1} 55% 55%), hsl(${h2} 60% 45%), hsl(${h1} 55% 55%))` }}
    />
  );
}
