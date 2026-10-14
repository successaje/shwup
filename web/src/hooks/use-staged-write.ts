"use client";

import { useCallback, useRef, useState } from "react";
import type { Hash, TransactionReceipt } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig, useConnection, useSwitchChain } from "wagmi";
import { simulateContract, waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { chain } from "@/config/chain";
import { toFriendlyError, unconfirmed, type FriendlyError } from "@/lib/errors";

/**
 * The stages a person sees for any on-chain action:
 *   preparing → signing (wallet prompt) → settling (submitted, awaiting Arc finality) → done
 */
export type Stage = "idle" | "preparing" | "signing" | "settling" | "done" | "error";

export type StagedResult = { hash: Hash; finalityMs: number; receipt: TransactionReceipt };
export type RunOutcome = ({ ok: true } & StagedResult) | { ok: false; error: FriendlyError | null };

/** A contract call; `value` is native USDC for payable functions (e.g. `rsvp`). */
type Request = Omit<Parameters<typeof simulateContract>[1], "value"> & { value?: bigint };

export function useStagedWrite() {
  const config = useConfig();
  const { chainId, address } = useConnection();
  const { switchChainAsync } = useSwitchChain();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<FriendlyError | null>(null);
  const [result, setResult] = useState<StagedResult | null>(null);
  const busy = useRef(false);
  const queryClient = useQueryClient();

  const run = useCallback(
    async (request: Request): Promise<RunOutcome> => {
      if (busy.current) return { ok: false, error: null };
      busy.current = true;
      let sent: `0x${string}` | undefined;
      setError(null);
      setResult(null);
      try {
        setStage("preparing");
        if (chainId !== chain.id) await switchChainAsync({ chainId: chain.id });
        // Simulate first so contract errors surface as readable messages before any wallet prompt.
        const { request: prepared } = await simulateContract(config, { ...request, account: address } as Parameters<typeof simulateContract>[1]);

        setStage("signing");
        const hash = await writeContract(config, prepared);
        sent = hash;

        setStage("settling");
        const sentAt = performance.now();
        const receipt = await waitForTransactionReceipt(config, { hash, pollingInterval: 250, timeout: 60_000 });
        const finalityMs = Math.round(performance.now() - sentAt);
        if (receipt.status !== "success") throw new Error("Transaction reverted");

        const r = { hash, finalityMs, receipt };
        setResult(r);
        setStage("done");
        // Every read (balances, tickets, guest lists) may have changed; refresh them now, not on the next poll.
        void queryClient.invalidateQueries();
        return { ok: true, ...r };
      } catch (e) {
        console.error(e);
        // Once the wallet has sent it, never claim nothing moved: point at the transaction instead.
        const friendly = sent ? unconfirmed(sent, e) : toFriendlyError(e);
        setError(friendly);
        setStage("error");
        return { ok: false, error: friendly };
      } finally {
        busy.current = false;
      }
    },
    [address, chainId, config, queryClient, switchChainAsync],
  );

  const reset = useCallback(() => {
    setStage("idle");
    setError(null);
    setResult(null);
  }, []);

  return { stage, error, result, run, reset, busy: stage === "preparing" || stage === "signing" || stage === "settling" };
}
