"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import { isNotFound } from "@/lib/errors";

/** What to show when an event can't be loaded: missing, or the network is unreachable. */
export function LoadError({ error, onRetry, backHref = "/app" }: { error: unknown; onRetry: () => void; backHref?: string }) {
  if (isNotFound(error) || !error) {
    return (
      <div className="flex max-w-md flex-col items-start gap-4 py-6">
        <h1 className="font-display text-2xl font-medium tracking-tight">Event not found</h1>
        <p className="text-sm text-ink-2">The link may be wrong, or the event lives on another network.</p>
        <ButtonLink href={backHref} variant="secondary">
          Go back
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="flex max-w-md flex-col items-start gap-4 py-6" role="alert">
      <h1 className="font-display text-2xl font-medium tracking-tight">Can&apos;t reach Arc right now</h1>
      <p className="text-sm text-ink-2">The network didn&apos;t respond. Nothing has changed with your deposit — try again in a moment.</p>
      <Button variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
