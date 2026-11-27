"use client";

import { BadgeCheck, Fingerprint, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { useConnection, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/wallet/account-button";
import { WalletList } from "@/components/wallet/connect-dialog";
import { SignInFailed, useSession, useSignIn } from "@/hooks/use-session";
import { shortAddress } from "@/lib/address";
import { toFriendlyError } from "@/lib/errors";
import { signInErrorText } from "@/lib/sign-in-message";

export type SignInStep = "loading" | "wallet" | "confirm" | "done";

/**
 * Where someone is in signing in: pick a wallet, then sign a message that proves it's theirs.
 * When this deployment has no accounts, connecting the wallet is the whole flow.
 */
export function useSignInStep(): SignInStep {
  const { address, status } = useConnection();
  const { enabled, user, loading } = useSession();
  // Only restoring a saved connection counts as loading. A connection in progress ("connecting")
  // stays on the wallet step: that's where the QR code and "check your wallet" live.
  if (loading || status === "reconnecting") return "loading";
  if (!address) return "wallet";
  if (enabled && !user) return "confirm";
  return "done";
}

export const STEP_COPY: Record<SignInStep, { title: string; description: string }> = {
  loading: { title: "Sign in", description: "One moment…" },
  wallet: { title: "Sign in", description: "Choose the wallet you use for ShwUp. We never hold your money." },
  confirm: { title: "Confirm it's you", description: "Sign a short message in your wallet. It's free and moves no money." },
  done: { title: "You're in", description: "" },
};

/** The steps themselves. `onDone` runs once, when the person is signed in (or connected, if accounts are off). */
export function SignInFlow({ onDone }: { onDone?: () => void }) {
  const step = useSignInStep();
  const done = useRef(false);
  useEffect(() => {
    if (step === "done" && !done.current) {
      done.current = true;
      onDone?.();
    }
  }, [step, onDone]);

  if (step === "loading") return <div className="h-40 animate-pulse rounded-md bg-sunken" aria-label="Loading" />;
  if (step === "wallet") return <WalletStep />;
  if (step === "confirm") return <ConfirmStep />;
  return (
    <p className="flex items-center gap-2 text-sm text-ok">
      <BadgeCheck className="size-4" /> Signed in.
    </p>
  );
}

function WalletStep() {
  return (
    <div className="flex flex-col gap-4">
      <WalletList />
      <p className="text-xs text-ink-3">
        Signing in lets ShwUp keep your profile and events across devices. Holding a spot only needs a wallet.
      </p>
    </div>
  );
}

function ConfirmStep() {
  const { address } = useConnection();
  const { disconnect } = useDisconnect();
  const signIn = useSignIn();
  if (!address) return null;

  const error = signIn.error;
  const message = !error
    ? null
    : error instanceof SignInFailed
      ? signInErrorText(error.code)
      : toFriendlyError(error).kind === "rejected"
        ? "You cancelled the signature in your wallet. Nothing happened."
        : toFriendlyError(error).detail;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-md border border-line bg-sunken/40 px-4 py-3">
        <Avatar address={address} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-3">Signing in as</p>
          <p className="num truncate text-sm">{shortAddress(address)}</p>
        </div>
        <button onClick={() => disconnect()} className="text-sm text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
          Switch
        </button>
      </div>

      <ul className="flex flex-col gap-2.5 text-sm text-ink-2">
        <li className="flex gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" />
          No fee, no transaction. Your wallet only shows a message to sign.
        </li>
        <li className="flex gap-2.5">
          <Fingerprint className="mt-0.5 size-4 shrink-0 text-ink-3" />
          It proves this wallet is yours, so your profile and events follow you to any device.
        </li>
      </ul>

      <Button size="lg" block loading={signIn.isPending} onClick={() => signIn.mutate(address)}>
        {signIn.isPending ? "Check your wallet" : "Sign in"}
      </Button>

      {message && (
        <p role="alert" className="rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
