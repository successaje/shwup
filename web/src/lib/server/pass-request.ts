import "server-only";
import { getAddress, isAddress } from "viem";
import { chain, explorerUrl, shwupAddress } from "@/config/chain";
import { TicketStatus } from "@/domain/event";
import { walletPassContent, type WalletPassContent } from "@/domain/wallet-pass";
import { readTicketForPass } from "@/lib/server/read-event";

/**
 * Resolves a pass request to its content, or the response to send instead. A pass is only issued
 * for a spot that is currently held on-chain. The pass carries nothing secret — the door checks the
 * chain, not the pass — so no signature from the holder is needed.
 */
export async function resolvePass(
  req: Request,
  params: { id: string; holder: string },
): Promise<{ ok: true; content: WalletPassContent; origin: string; contractLine: string } | { ok: false; response: Response }> {
  const fail = (status: number, message: string) => ({ ok: false as const, response: new Response(message, { status, headers: { "Cache-Control": "no-store" } }) });

  if (!/^\d{1,20}$/.test(params.id) || !isAddress(params.holder) || !shwupAddress) return fail(404, "Not found");
  const id = BigInt(params.id);
  const holder = getAddress(params.holder);

  const read = await readTicketForPass(id, holder);
  if (!read || read.event.organizer === "0x0000000000000000000000000000000000000000") return fail(404, "Event not found");
  if (read.status !== TicketStatus.Held || read.event.cancelled) return fail(409, "This wallet doesn't hold a spot for this event.");

  const origin = new URL(req.url).origin;
  return {
    ok: true,
    origin,
    content: walletPassContent({ event: read.event, holder, holderName: read.name, origin, chainId: chain.id, contract: shwupAddress }),
    contractLine: `${chain.name} · ${explorerUrl("address", shwupAddress) ?? shwupAddress}`,
  };
}
