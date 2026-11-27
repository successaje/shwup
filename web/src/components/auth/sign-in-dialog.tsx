"use client";

import { Dialog } from "@/components/ui/dialog";
import { SignInFlow, STEP_COPY, useSignInStep } from "./sign-in-flow";

/** Sign in without leaving the page: wallet, then a signature. Closes itself when done. */
export function SignInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const step = useSignInStep();
  const copy = STEP_COPY[step];
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={copy.title} description={copy.description || undefined}>
      {open && <SignInFlow onDone={() => onOpenChange(false)} />}
    </Dialog>
  );
}
