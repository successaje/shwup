"use client";

import { zeroAddress, type Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { chain, shwupAddress } from "@/config/chain";
import { toShwUpEvent, type ShwUpEvent, type TicketStatus } from "@/domain/event";
import { shwupAbi } from "@/lib/contracts/shwup-abi";

const contract = { address: shwupAddress!, abi: shwupAbi, chainId: chain.id } as const;
export const shwupContract = contract;

export const isConfigured = Boolean(shwupAddress);

/** One event, kept fresh. Arc finalizes in under a second, so a short poll feels live. */
export function useEvent(id: bigint | undefined, { live = false } = {}) {
  const query = useReadContract({
    ...contract,
    functionName: "getEvent",
    args: id !== undefined ? [id] : undefined,
    query: { enabled: isConfigured && id !== undefined, refetchInterval: live ? 1_500 : 8_000 },
  });
  return { ...query, event: query.data && id !== undefined ? toShwUpEvent(id, query.data) : undefined };
}

export type TicketView = { status: TicketStatus; bonusClaimed: boolean; claimable: bigint };

/** The connected person's ticket for an event, polled fast while they wait at the door. */
export function useTicket(id: bigint | undefined, holder: Address | undefined, { live = false } = {}) {
  const enabled = isConfigured && id !== undefined && !!holder;
  const args = [id ?? 0n, holder ?? zeroAddress] as const;
  const query = useReadContracts({
    contracts: [
      { ...contract, functionName: "ticketOf", args },
      { ...contract, functionName: "claimable", args },
    ],
    allowFailure: false,
    query: { enabled, refetchInterval: live ? 1_000 : 8_000 },
  });
  const ticket: TicketView | undefined = query.data
    ? {
        status: query.data[0].status as TicketStatus,
        bonusClaimed: query.data[0].bonusClaimed,
        claimable: query.data[1],
      }
    : undefined;
  return { ...query, ticket };
}

/** Events a wallet organizes and attends, newest first. */
export function useMyEvents(owner: Address | undefined) {
  const enabled = isConfigured && !!owner;
  const ids = useReadContracts({
    contracts: [
      { ...contract, functionName: "eventsOrganizedBy", args: [owner ?? zeroAddress] },
      { ...contract, functionName: "eventsAttendedBy", args: [owner ?? zeroAddress] },
    ],
    allowFailure: false,
    query: { enabled },
  });

  const organized = [...(ids.data?.[0] ?? [])].reverse();
  const attending = [...(ids.data?.[1] ?? [])].reverse();
  const all = [...new Set([...organized, ...attending])];

  const details = useReadContracts({
    contracts: all.map((id) => ({ ...contract, functionName: "getEvent", args: [id] }) as const),
    allowFailure: false,
    query: { enabled: all.length > 0 },
  });

  const byId = new Map<bigint, ShwUpEvent>();
  details.data?.forEach((raw, i) => byId.set(all[i], toShwUpEvent(all[i], raw)));

  return {
    isLoading: ids.isLoading || (all.length > 0 && details.isLoading),
    isError: ids.isError || details.isError,
    refetch: () => Promise.all([ids.refetch(), details.refetch()]),
    organized: organized.map((id) => byId.get(id)).filter(Boolean) as ShwUpEvent[],
    attending: attending.map((id) => byId.get(id)).filter(Boolean) as ShwUpEvent[],
  };
}
