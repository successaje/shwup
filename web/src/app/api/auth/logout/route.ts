import { cookies } from "next/headers";
import { json } from "@/lib/server/auth/http";
import { SESSION_COOKIE, signOut } from "@/lib/server/auth/session";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** End this browser's session. */
export async function POST() {
  const jar = await cookies();
  const db = getDb();
  if (db) await signOut(db, jar.get(SESSION_COOKIE)?.value).catch(() => {});
  jar.delete(SESSION_COOKIE);
  return json({ ok: true });
}
