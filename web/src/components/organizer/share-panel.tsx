"use client";

import { ArrowUpRight, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import { useOrigin } from "@/hooks/use-origin";

export function SharePanel({ eventId }: { eventId: bigint }) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const url = `${origin}/e/${eventId}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="rounded-md border border-line bg-surface p-5">
      <h2 className="text-sm font-medium">Invite link</h2>
      <p className="mt-1 text-xs text-ink-3">Guests open this to hold a spot.</p>
      <div className="mt-4 flex items-center gap-2">
        <code className="num min-w-0 flex-1 truncate rounded-sm bg-sunken px-3 py-2.5 text-xs text-ink-2">
          {origin ? url.replace(/^https?:\/\//, "") : "…"}
        </code>
        <Button size="sm" variant="secondary" onClick={copy} disabled={!origin} aria-live="polite">
          {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        {origin && <QrCode value={url} label="QR code for the invite link" className="size-28" />}
        <Link href={`/e/${eventId}`} className="inline-flex items-center gap-0.5 text-sm text-ink-2 hover:text-ink">
          Guest page <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </section>
  );
}
