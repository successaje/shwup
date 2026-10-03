"use client";

import { useEffect } from "react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-5 px-4 py-20" role="alert">
      <Wordmark />
      <h1 className="font-display text-3xl font-medium tracking-tight">Something broke on our side</h1>
      <p className="text-ink-2">Your deposits are safe — they live in the contract, not in this page. Reload and try again.</p>
      <Button onClick={reset}>Reload</Button>
    </main>
  );
}
