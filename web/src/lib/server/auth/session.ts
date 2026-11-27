import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import type { Address, Hex } from "viem";
import { generateSiweNonce, parseSiweMessage, validateSiweMessage } from "viem/siwe";
import type { Db } from "@/lib/server/db";
import { sessions, siweNonces, users, type User } from "@/lib/server/db/schema";

export const SESSION_COOKIE = "shwup-session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const NONCE_TTL_MS = 10 * 60 * 1000;

/** Checks a signature for an address. In the app this is a chain client, so passkey smart accounts (ERC-1271/6492) work too. */
export type VerifySignature = (args: { address: Address; message: string; signature: Hex }) => Promise<boolean>;

export type SignInErrorCode = "malformed" | "wrong-domain" | "wrong-chain" | "expired" | "nonce" | "signature";

export class SignInError extends Error {
  constructor(readonly code: SignInErrorCode) {
    super(`Sign-in failed: ${code}`);
    this.name = "SignInError";
  }
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** A fresh single-use nonce for a sign-in message. Expired nonces are swept on the way. */
export async function issueNonce(db: Db, now = new Date()): Promise<string> {
  await db.delete(siweNonces).where(lt(siweNonces.expiresAt, now));
  const nonce = generateSiweNonce();
  await db.insert(siweNonces).values({ nonce, expiresAt: new Date(now.getTime() + NONCE_TTL_MS) });
  return nonce;
}

/**
 * Verify a signed Sign-In With Ethereum message and open a session. The nonce is consumed before the
 * signature is checked, so a message can never be replayed, even after a failed attempt.
 */
export async function signIn(
  db: Db,
  input: { message: string; signature: Hex },
  opts: { domain: string; chainId: number; verify: VerifySignature; now?: Date },
): Promise<{ token: string; user: User; expiresAt: Date }> {
  const now = opts.now ?? new Date();
  const parsed = parseSiweMessage(input.message);
  if (!parsed.address || !parsed.nonce || !parsed.domain || !parsed.chainId) throw new SignInError("malformed");
  if (parsed.domain !== opts.domain) throw new SignInError("wrong-domain");
  if (parsed.chainId !== opts.chainId) throw new SignInError("wrong-chain");
  if (!validateSiweMessage({ message: parsed, domain: opts.domain, time: now })) throw new SignInError("expired");

  const [nonce] = await db
    .delete(siweNonces)
    .where(and(eq(siweNonces.nonce, parsed.nonce), gt(siweNonces.expiresAt, now)))
    .returning();
  if (!nonce) throw new SignInError("nonce");

  const valid = await opts.verify({ address: parsed.address, message: input.message, signature: input.signature }).catch(() => false);
  if (!valid) throw new SignInError("signature");

  const address = parsed.address.toLowerCase();
  const [user] = await db
    .insert(users)
    .values({ address })
    .onConflictDoUpdate({ target: users.address, set: { updatedAt: now } })
    .returning();

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId: user.id, expiresAt });
  return { token, user, expiresAt };
}

/** The signed-in user for a session token, or null if it's unknown or expired. */
export async function getSessionUser(db: Db, token: string | undefined, now = new Date()): Promise<User | null> {
  if (!token) return null;
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)))
    .limit(1);
  return row?.user ?? null;
}

/** End one session. */
export async function signOut(db: Db, token: string | undefined): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
