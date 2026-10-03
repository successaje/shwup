import type { Metadata } from "next";
import { Suspense } from "react";
import { NewEventScreen } from "@/components/event/new-event-screen";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <div className="animate-rise">
      <header className="mb-10 max-w-xl">
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">New event</h1>
        <p className="mt-2 text-ink-2">Set a small deposit. People who come get it back at the door.</p>
      </header>
      <Suspense>
        <NewEventScreen />
      </Suspense>
    </div>
  );
}
