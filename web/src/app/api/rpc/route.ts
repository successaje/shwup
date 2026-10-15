import { rpcUrl } from "@/config/chain";
import { relayRejection, RELAY_MAX_BODY } from "@/lib/rpc-relay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const error = (status: number, message: string) =>
  Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message } }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Same-origin JSON-RPC relay for the app's reads. Some browsers, extensions and networks block
 * direct requests to the chain's RPC host; requests to our own domain aren't treated that way.
 * Read methods only — transactions are always signed and sent by the person's wallet.
 */
export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > RELAY_MAX_BODY) return error(413, "request too large");

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "invalid JSON");
  }
  const rejection = relayRejection(body);
  if (rejection) return error(400, rejection);

  try {
    const upstream = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: text,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return error(502, "upstream RPC unreachable");
  }
}
