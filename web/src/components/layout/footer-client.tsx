"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBlockNumber } from "wagmi";
import { chain, chainKey } from "@/config/chain";
import { cn } from "@/lib/cn";

/** "Arc mainnet · block #…" with a live pulse — the network the money settles on. */
export function NetworkPill({ className }: { className?: string }) {
  const { data: block } = useBlockNumber({ watch: true, chainId: chain.id, query: { refetchInterval: 4_000 } });
  const name = chainKey === "arc" ? "Arc mainnet" : chainKey === "arcTestnet" ? "Arc testnet" : chain.name;
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border border-night-line px-3 py-1 text-xs text-night-ink-2", className)}>
      <span className="relative flex size-2" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#3fcf8e] opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex size-2 rounded-full bg-[#3fcf8e]" />
      </span>
      {name}
      {block !== undefined && <span className="font-mono text-night-ink">#{block.toLocaleString("en-US")}</span>}
    </span>
  );
}

/** The SHOWED UP stamp lands on the footer wordmark once, when it scrolls into view. */
export function StampOnView({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <span ref={ref} className={cn("inline-block", seen ? "animate-stamp motion-reduce:animate-none" : "opacity-0 motion-reduce:opacity-100")}>
      {children}
    </span>
  );
}

/** A short contract address that copies the full one. */
export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-night-ink-2 hover:text-night-ink"
      aria-label="Copy contract address"
    >
      {address.slice(0, 6)}…{address.slice(-4)}
      {copied ? <Check className="size-3 text-[#3fcf8e]" /> : <Copy className="size-3" />}
    </button>
  );
}
