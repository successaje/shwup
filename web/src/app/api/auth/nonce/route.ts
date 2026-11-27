import { accountsOff, json } from "@/lib/server/auth/http";
import { issueNonce } from "@/lib/server/auth/session";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** A single-use nonce to put in the Sign-In With Ethereum message. */
export async function GET() {
  const db = getDb();
  if (!db) return accountsOff();
  return json({ nonce: await issueNonce(db) });
}
