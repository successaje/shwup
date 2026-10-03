"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { chain, deployBlock, shwupAddress } from "@/config/chain";
import { shwupAbi } from "@/lib/contracts/shwup-abi";

/**
 * The on-chain proof of a door refund: the `CheckedIn` log for this guest. Best effort — if the RPC
 * refuses the log range we simply don't show a receipt link.
 */
export function useCheckInReceipt(eventId: bigint, attendee: Address | undefined, enabled: boolean) {
  const client = usePublicClient({ chainId: chain.id });
  return useQuery({
    queryKey: ["check-in-receipt", eventId.toString(), attendee],
    enabled: enabled && !!client && !!attendee && !!shwupAddress,
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const logs = await client!.getContractEvents({
        address: shwupAddress!,
        abi: shwupAbi,
        eventName: "CheckedIn",
        args: { eventId, attendee },
        fromBlock: deployBlock,
      });
      const log = logs.at(-1);
      return log ? { hash: log.transactionHash, by: log.args.by } : null;
    },
  });
}
