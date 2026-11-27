"use client";

import { Check, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

/** A hex value that copies itself. */
export function CopyHex({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className={cn("group inline-flex items-center gap-1.5 font-mono text-xs text-ink-2 hover:text-ink", className)}
      aria-label={`Copy ${value}`}
    >
      {value}
      {copied ? <Check className="size-3 text-ok" /> : <Copy className="size-3 opacity-0 transition-opacity group-hover:opacity-100" />}
    </button>
  );
}

/** The signature moment: a stub that gets stamped. Replays on demand. */
export function StampDemo() {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-5">
      <div className="relative w-72 overflow-hidden rounded-lg border border-line bg-surface p-6 shadow-[0_24px_50px_-30px_rgb(24_23_15/0.35)]">
        <p className="font-mono text-[0.6875rem] tracking-[0.2em] text-stamp">ADMIT ONE</p>
        <p className="mt-2 font-display text-xl font-medium">Builders Night</p>
        <div className="my-5 border-t-2 border-dashed border-line-strong" />
        <p className="text-xs text-ink-3">Back in your wallet</p>
        <p className="font-mono text-3xl text-ok">$5.00</p>
        <span
          key={run}
          className="absolute right-5 bottom-6 animate-stamp rounded-sm border-[3px] border-stamp px-2 py-1 font-display text-sm font-bold tracking-[0.08em] text-stamp motion-reduce:animate-none"
        >
          SHOWED UP
        </span>
      </div>
      <button
        type="button"
        onClick={() => setRun((r) => r + 1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline"
      >
        <RotateCcw className="size-3.5" /> Stamp it again
      </button>
    </div>
  );
}
