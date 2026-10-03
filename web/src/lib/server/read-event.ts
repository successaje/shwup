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
