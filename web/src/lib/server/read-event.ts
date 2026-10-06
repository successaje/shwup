import "server-only";
import { createPublicClient, http, type Address } from "viem";
import { chain, rpcUrl, shwupAddress } from "@/config/chain";
import { toShwUpEvent, type ShwUpEvent, type TicketStatus } from "@/domain/event";
import { shwupAbi } from "@/lib/contracts/shwup-abi";

const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 4_000 }) });

/** Server-side read used only for page metadata. Returns null rather than failing the page. */
export async function readEventForMetadata(id: bigint): Promise<ShwUpEvent | null> {
  if (!shwupAddress) return null;
  try {
    const raw = await client.readContract({ address: shwupAddress, abi: shwupAbi, functionName: "getEvent", args: [id] });
    return toShwUpEvent(id, raw);
  } catch {
    return null;
  }
}

/** A holder's ticket status and public name, for issuing wallet passes. Null if unreadable. */
export async function readTicketForPass(id: bigint, holder: Address): Promise<{ event: ShwUpEvent; status: TicketStatus; name: string } | null> {
  if (!shwupAddress) return null;
  try {
    const [raw, ticket, name] = await Promise.all([
      client.readContract({ address: shwupAddress, abi: shwupAbi, functionName: "getEvent", args: [id] }),
      client.readContract({ address: shwupAddress, abi: shwupAbi, functionName: "ticketOf", args: [id, holder] }),
      client.readContract({ address: shwupAddress, abi: shwupAbi, functionName: "nameOf", args: [holder] }),
    ]);
    return { event: toShwUpEvent(id, raw), status: ticket.status as TicketStatus, name };
  } catch {
    return null;
  }
}

/** Every event on the contract (up to `max`), for public totals. Null if the chain can't be read. */
export async function readAllEvents(max = 2_000): Promise<ShwUpEvent[] | null> {
  if (!shwupAddress) return null;
  try {
    const count = await client.readContract({ address: shwupAddress, abi: shwupAbi, functionName: "eventCount" });
    const n = Number(count < BigInt(max) ? count : BigInt(max));
    const ids = Array.from({ length: n }, (_, i) => BigInt(i + 1));
    const read = (id: bigint) => client.readContract({ address: shwupAddress!, abi: shwupAbi, functionName: "getEvent", args: [id] });
    const raws = chain.contracts?.multicall3
      ? (await client.multicall({
          contracts: ids.map((id) => ({ address: shwupAddress!, abi: shwupAbi, functionName: "getEvent", args: [id] }) as const),
          allowFailure: false,
          batchSize: 64_000,
        }))
      : await Promise.all(ids.map(read)); // local anvil has no multicall3
    return raws.map((raw, i) => toShwUpEvent(ids[i], raw));
  } catch {
    return null;
  }
}
