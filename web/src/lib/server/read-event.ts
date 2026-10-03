import "server-only";
import { createPublicClient, http } from "viem";
import { chain, rpcUrl, shwupAddress } from "@/config/chain";
import { toShwUpEvent, type ShwUpEvent } from "@/domain/event";
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
