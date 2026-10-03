import { googleSaveUrl } from "@/lib/server/google-pass";
import { resolvePass } from "@/lib/server/pass-request";
import { googleWalletConfig } from "@/lib/server/wallet-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Redirects to Google Wallet's "Save" page for a held spot. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; holder: string }> }) {
  const config = googleWalletConfig();
  if (!config) return new Response("Google Wallet passes aren't set up", { status: 503 });

  const resolved = await resolvePass(req, await params);
  if (!resolved.ok) return resolved.response;

  try {
    return new Response(null, {
      status: 302,
      headers: { Location: await googleSaveUrl(resolved.content, config, resolved.origin), "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("google pass", e);
    return new Response("Couldn't create the pass in Google Wallet", { status: 502 });
  }
}
