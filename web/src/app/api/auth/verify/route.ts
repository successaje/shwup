import { cookies } from "next/headers";
import { isHex } from "viem";
import { chain } from "@/config/chain";
import { accountsOff, json, sessionCookie, toPublicUser } from "@/lib/server/auth/http";
import { signIn, SignInError } from "@/lib/server/auth/session";
import { chainClient } from "@/lib/server/chain-client";
import { getDb } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Check a signed sign-in message and set the session cookie. */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) return accountsOff();

  const body = (await req.json().catch(() => null)) as { message?: unknown; signature?: unknown } | null;
  const message = body?.message;
  const signature = body?.signature;
  if (typeof message !== "string" || message.length > 4_000 || typeof signature !== "string" || !isHex(signature)) {
    return json({ error: "malformed" }, 400);
  }

  try {
    const { token, user, expiresAt } = await signIn(
      db,
      { message, signature },
      // verifyMessage handles plain wallets and smart accounts (ERC-1271, and ERC-6492 before deployment).
      { domain: new URL(req.url).host, chainId: chain.id, verify: (a) => chainClient.verifyMessage(a) },
    );
    (await cookies()).set(sessionCookie(token, expiresAt));
    return json({ user: toPublicUser(user) });
  } catch (e) {
    if (e instanceof SignInError) return json({ error: e.code }, 401);
    throw e;
  }
}
