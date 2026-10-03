import { buildApplePass } from "@/lib/server/apple-pass";
import { resolvePass } from "@/lib/server/pass-request";
import { appleWalletConfig } from "@/lib/server/wallet-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A signed .pkpass for a held spot. Safari on iPhone opens it straight into "Add to Apple Wallet". */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; holder: string }> }) {
  const config = appleWalletConfig();
  if (!config) return new Response("Apple Wallet passes aren't set up", { status: 503 });

  const resolved = await resolvePass(req, await params);
  if (!resolved.ok) return resolved.response;

  try {
    const pass = await buildApplePass(resolved.content, config, resolved.contractLine);
    return new Response(new Uint8Array(pass), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="shwup-ticket.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("apple pass", e);
    return new Response("Couldn't sign the pass", { status: 500 });
  }
}
