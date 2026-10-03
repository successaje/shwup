"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { CreateEventForm } from "@/components/event/create-event-form";
import { Skeleton } from "@/components/ui/skeleton";
import { formFromEvent, formWithDefaults } from "@/domain/create-event";
import { TEMPLATES, templateFor, type TemplateKey } from "@/domain/templates";
import { useEvent } from "@/hooks/use-shwup";
import { cn } from "@/lib/cn";
import { loadOrganizerDefaults } from "@/lib/organizer-prefs";

const noop = () => () => {};

/**
 * Chooses what the form starts from: an existing event ("Run it again", `?from=12`), a kind of
 * commitment (`?template=table`), or this organizer's remembered defaults. Renders after hydration
 * because defaults live in the browser.
 */
export function NewEventScreen() {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const params = useSearchParams();
  const fromParam = params.get("from");
  const templateKey = params.get("template");
  const template = templateFor(templateKey);
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
  return (
    <>
      <TemplatePicker active={template ? (templateKey as TemplateKey) : null} />
      <CreateEventForm
        key={`new-${templateKey ?? ""}`}
        initial={template ? { ...formWithDefaults(loadOrganizerDefaults()), ...template.form } : formWithDefaults(loadOrganizerDefaults())}
      />
    </>
  );
}

/** Same contract, different terms: a quick way to start from the kind of commitment you need. */
function TemplatePicker({ active }: { active: TemplateKey | null }) {
  const current = active ? TEMPLATES[active] : null;
  return (
    <div className="-mt-4 mb-10">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-3">Start from</span>
        {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => (
          <Link
            key={key}
            href={active === key ? "/app/new" : `/app/new?template=${key}`}
            aria-current={active === key ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 transition-colors",
              active === key ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink",
            )}
          >
            {TEMPLATES[key].label}
          </Link>
        ))}
      </div>
      {current && <p className="mt-2 text-sm text-ink-2">{current.blurb}</p>}
    </div>
  );
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
