import "server-only";
import { cookies } from "next/headers";
import type { User } from "@/lib/server/db/schema";
import { getDb } from "@/lib/server/db";
import { getSessionUser, SESSION_COOKIE } from "./session";

/** What the browser may see about a user. Email stays server-side. */
export type PublicUser = Pick<User, "id" | "address" | "handle" | "displayName" | "avatarUrl" | "bio">;

export const toPublicUser = ({ id, address, handle, displayName, avatarUrl, bio }: User): PublicUser => ({
  id,
  address,
  handle,
  displayName,
  avatarUrl,
  bio,
});

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Accounts need a database; without one the endpoints answer 503 and the app runs wallet-only. */
export const accountsOff = () => json({ error: "accounts-off" }, 503);

export const sessionCookie = (token: string, expires: Date) => ({
  name: SESSION_COOKIE,
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires,
});

/** The signed-in user for this request (server components and route handlers), or null. */
export async function currentUser(): Promise<User | null> {
  const db = getDb();
  if (!db) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getSessionUser(db, token).catch(() => null);
}
