"use client";

import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { CreateEventForm } from "@/components/event/create-event-form";
import { Skeleton } from "@/components/ui/skeleton";
import { formFromEvent, formWithDefaults } from "@/domain/create-event";
import { useEvent } from "@/hooks/use-shwup";
import { loadOrganizerDefaults } from "@/lib/organizer-prefs";

const noop = () => () => {};

/**
 * Chooses what the form starts from: an existing event ("Run it again", `?from=12`), or this
 * organizer's remembered defaults. Renders after hydration because both live in the browser.
 */
export function NewEventScreen() {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const fromParam = useSearchParams().get("from");
  const fromId = fromParam && /^\d{1,20}$/.test(fromParam) ? BigInt(fromParam) : undefined;
  const { event, isLoading } = useEvent(fromId);

  if (!hydrated || (fromId !== undefined && isLoading)) return <FormSkeleton />;

  if (fromId !== undefined && event) {
    return (
      <>
        <p className="-mt-6 mb-10 text-sm text-ink-2">
          Copied from <span className="font-medium text-ink">{event.details.name}</span> — same details and rules, one week later. Change anything.
        </p>
        <CreateEventForm key={`from-${fromId}`} initial={formFromEvent(event)} />
      </>
    );
  }
  return <CreateEventForm key="new" initial={formWithDefaults(loadOrganizerDefaults())} />;
}

function FormSkeleton() {
  return (
    <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_360px]" aria-busy aria-label="Loading">
      <div className="flex flex-col gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  );
}
