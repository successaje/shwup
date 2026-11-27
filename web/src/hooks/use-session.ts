"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { Address } from "viem";
import { useConnection, useDisconnect, useSignMessage } from "wagmi";
import { chain } from "@/config/chain";
import type { PublicUser } from "@/domain/account";
import { signInMessage } from "@/lib/sign-in-message";

type SessionState = { enabled: boolean; user: PublicUser | null };

export const SESSION_KEY = ["session"] as const;

/** A failed sign-in, carrying the server's reason (see `signInErrorText`). */
export class SignInFailed extends Error {
  constructor(readonly code: string) {
    super(`Sign-in failed: ${code}`);
    this.name = "SignInFailed";
  }
}

async function fetchSession(): Promise<SessionState> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) return { enabled: false, user: null };
  return res.json();
}

/**
 * The signed-in account. A session only counts for the wallet that's connected: if the person
 * switches wallets, they're treated as signed out until the new wallet signs in.
 */
export function useSession() {
  const { address } = useConnection();
  const query = useQuery({ queryKey: SESSION_KEY, queryFn: fetchSession, staleTime: 60_000 });
  const sessionUser = query.data?.user ?? null;
  const matches = sessionUser !== null && (!address || sessionUser.address === address.toLowerCase());
  return {
    /** Whether this deployment has accounts (a database). Off means wallet-only. */
    enabled: query.data?.enabled ?? false,
    user: matches ? sessionUser : null,
    /** Signed in with a different wallet than the one connected now. */
    mismatched: sessionUser !== null && !matches,
    loading: query.isPending,
  };
}

/** Ask the connected wallet to sign a sign-in message, then open a session. No gas, no money. */
export function useSignIn() {
  const qc = useQueryClient();
  const { signMessageAsync } = useSignMessage();
  return useMutation({
    mutationFn: async (address: Address) => {
      const nonceRes = await fetch("/api/auth/nonce", { cache: "no-store" });
      if (!nonceRes.ok) throw new SignInFailed(nonceRes.status === 503 ? "accounts-off" : "unknown");
      const { nonce } = (await nonceRes.json()) as { nonce: string };

      const message = signInMessage({ address, chainId: chain.id, nonce, origin: window.location.origin });
      const signature = await signMessageAsync({ account: address, message });

      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, signature }),
      });
      const body = (await res.json().catch(() => ({}))) as { user?: PublicUser; error?: string };
      if (!res.ok || !body.user) throw new SignInFailed(body.error ?? "unknown");
      return body.user;
    },
    onSuccess: (user) => qc.setQueryData<SessionState>(SESSION_KEY, { enabled: true, user }),
  });
}

/** End the session on this device and disconnect the wallet. */
export function useSignOut() {
  const qc = useQueryClient();
  const { disconnect } = useDisconnect();
  return useMutation({
    mutationFn: async ({ keepWallet = false }: { keepWallet?: boolean } = {}) => {
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      if (!keepWallet) disconnect();
    },
    onSettled: () => qc.setQueryData<SessionState>(SESSION_KEY, (s) => ({ enabled: s?.enabled ?? false, user: null })),
  });
}

/**
 * Keeps the session honest: when the connected wallet changes to one the session isn't for, the
 * old session is ended rather than left open on this device. Mounted once, in the providers.
 */
export function useSessionGuard() {
  const { mismatched } = useSession();
  const signOut = useSignOut();
  const { mutate } = signOut;
  useEffect(() => {
    if (mismatched) mutate({ keepWallet: true });
  }, [mismatched, mutate]);
}
