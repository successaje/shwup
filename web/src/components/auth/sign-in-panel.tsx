"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { SignInFlow, STEP_COPY, useSignInStep } from "./sign-in-flow";

/** The form side of /sign-in: the current step's heading and the flow, then on to `next`. */
export function SignInPanel({ next }: { next: string }) {
  const router = useRouter();
  const step = useSignInStep();
  const copy = STEP_COPY[step];
  const onDone = useCallback(() => {
    router.replace(next);
    router.refresh();
  }, [router, next]);

  return (
    <div className="w-full max-w-sm">
      <h1 key={copy.title} className="animate-rise font-display text-3xl font-medium tracking-tight">
        {copy.title}
      </h1>
      {copy.description && <p className="mt-2 text-ink-2">{copy.description}</p>}
      <div className="mt-8">
        <SignInFlow onDone={onDone} />
      </div>
    </div>
  );
}
