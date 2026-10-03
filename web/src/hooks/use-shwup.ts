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

  const tickets = useReadContracts({
    contracts: attending.flatMap((id) => [
      { ...contract, functionName: "ticketOf", args: [id, owner ?? zeroAddress] } as const,
      { ...contract, functionName: "claimable", args: [id, owner ?? zeroAddress] } as const,
    ]),
    allowFailure: false,
    query: { enabled: enabled && attending.length > 0 },
  });

  const byId = new Map<bigint, ShwUpEvent>();
  details.data?.forEach((raw, i) => byId.set(all[i], toShwUpEvent(all[i], raw)));

  const ticketById = new Map<bigint, TicketView>();
  if (tickets.data) {
    attending.forEach((id, i) => {
      const t = tickets.data[i * 2] as { status: number; bonusClaimed: boolean };
      ticketById.set(id, { status: t.status as TicketStatus, bonusClaimed: t.bonusClaimed, claimable: tickets.data[i * 2 + 1] as bigint });
    });
  }

  return {
    isLoading: ids.isLoading || (all.length > 0 && details.isLoading) || (attending.length > 0 && tickets.isLoading),
    isError: ids.isError || details.isError || tickets.isError,
    refetch: () => Promise.all([ids.refetch(), details.refetch(), tickets.refetch()]),
    organized: organized.map((id) => byId.get(id)).filter(Boolean) as ShwUpEvent[],
    attending: attending
      .map((id) => ({ event: byId.get(id), ticket: ticketById.get(id) }))
      .filter((x): x is { event: ShwUpEvent; ticket: TicketView | undefined } => !!x.event),
  };
}

export type AttendeeRow = { address: Address; status: TicketStatus };

/** Attendee list for the organizer console and door. First 500; enough for v1 events. */
export function useAttendees(id: bigint | undefined, { live = false } = {}) {
  const query = useReadContract({
    ...contract,
    functionName: "getAttendees",
    args: [id ?? 0n, 0n, 500n],
    query: { enabled: isConfigured && id !== undefined, refetchInterval: live ? 2_000 : 10_000 },
  });
  const rows: AttendeeRow[] | undefined = query.data
    ? query.data[0].map((address, i) => ({ address, status: query.data[1][i] as TicketStatus }))
    : undefined;
  return { ...query, rows };
}

/** Public display names for a set of wallets. Missing names are simply absent from the map. */
export function useNames(addresses: readonly Address[] | undefined) {
  const list = addresses ?? [];
  const query = useReadContract({
    ...contract,
    functionName: "namesOf",
    args: [list],
    query: { enabled: isConfigured && list.length > 0, staleTime: 30_000 },
  });
  const names = new Map<string, string>();
  query.data?.forEach((n, i) => n.trim() && names.set(list[i].toLowerCase(), n.trim()));
  return { ...query, names, nameFor: (a: Address) => names.get(a.toLowerCase()) };
}

/** The connected wallet's own display name. */
export function useMyName(address: Address | undefined) {
  const query = useReadContract({
    ...contract,
    functionName: "nameOf",
    args: [address ?? zeroAddress],
    query: { enabled: isConfigured && !!address },
  });
  return { ...query, name: query.data?.trim() ?? "" };
}

/** Every event an organizer has created, for their public track record. */
export function useOrganizerEvents(organizer: Address | undefined) {
  const ids = useReadContract({
    ...contract,
    functionName: "eventsOrganizedBy",
    args: [organizer ?? zeroAddress],
    query: { enabled: isConfigured && !!organizer, staleTime: 60_000 },
  });
  const list = ids.data ?? [];
  const details = useReadContracts({
    contracts: list.map((id) => ({ ...contract, functionName: "getEvent", args: [id] }) as const),
    allowFailure: false,
    query: { enabled: list.length > 0, staleTime: 60_000 },
  });
  const events = details.data?.map((raw, i) => toShwUpEvent(list[i], raw));
  return { events, isLoading: ids.isLoading || (list.length > 0 && details.isLoading) };
}
