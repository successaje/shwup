"use client";

import { Check, Copy, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { QrCode } from "@/components/qr-code";
import { Button } from "@/components/ui/button";
import type { ShwUpEvent } from "@/domain/event";
import { useOrigin } from "@/hooks/use-origin";
import { formatUsd } from "@/lib/money";
import { formatWhen } from "@/lib/time";

export function SharePanel({ event }: { event: ShwUpEvent }) {
  const eventId = event.id;
  const origin = useOrigin();
  const [copied, setCopied] = useState<"link" | "message" | null>(null);
  const url = `${origin}/e/${eventId}`;

  const copy = async (what: "link" | "message") => {
    await navigator.clipboard.writeText(what === "link" ? url : inviteMessage(event, url));
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <section className="rounded-md border border-line bg-surface p-5">
      <h2 className="text-sm font-medium">Invite link</h2>
      <p className="mt-1 text-xs text-ink-3">Guests open this to hold a spot.</p>
      <div className="mt-4 flex items-center gap-2">
        <code className="num min-w-0 flex-1 truncate rounded-sm bg-sunken px-3 py-2.5 text-xs text-ink-2">
          {origin ? url.replace(/^https?:\/\//, "") : "…"}
        </code>
        <Button size="sm" variant="secondary" onClick={() => copy("link")} disabled={!origin} aria-live="polite">
          {copied === "link" ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
          {copied === "link" ? "Copied" : "Copy"}
        </Button>
      </div>
      <button
        onClick={() => copy("message")}
        disabled={!origin}
        className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink disabled:opacity-50"
      >
        {copied === "message" ? <Check className="size-3.5 text-ok" /> : <MessageSquareText className="size-3.5" />}
        {copied === "message" ? "Message copied — paste it in your group chat" : "Copy invite message"}
      </button>
      {origin && <QrCode value={url} label="QR code for the invite link" className="mt-5 size-28" />}
    </section>
  );
}

/** Ready to paste into WhatsApp/Telegram/Discord: what, when, where, the deal, the link. */
function inviteMessage(event: ShwUpEvent, url: string) {
  const where = event.details.location ? `, ${event.details.location}` : "";
  return `${event.details.name} — ${formatWhen(event.startsAt, { zone: true })}${where}.\nHold your spot with a ${formatUsd(event.deposit)} deposit. You get it back the moment you're checked in: ${url}`;
}
