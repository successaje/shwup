import { verifyMessage } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/lib/server/db";
import { sessions } from "@/lib/server/db/schema";
import { testDb } from "@/test/db";
import { getSessionUser, issueNonce, NONCE_TTL_MS, SESSION_TTL_MS, signIn, signOut, type VerifySignature } from "./session";

// A throwaway test key (Anvil's well-known account #0), never used for anything real.
const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
const DOMAIN = "shwup.test";
const CHAIN_ID = 5042;
const verify: VerifySignature = (a) => verifyMessage(a);
const opts = { domain: DOMAIN, chainId: CHAIN_ID, verify };

async function signedMessage(nonce: string, over: Partial<Parameters<typeof createSiweMessage>[0]> = {}) {
  const message = createSiweMessage({
    address: account.address,
    chainId: CHAIN_ID,
    domain: DOMAIN,
    nonce,
    uri: `https://${DOMAIN}`,
    version: "1",
    ...over,
  });
  return { message, signature: await account.signMessage({ message }) };
}

describe("sessions", () => {
  let db: Db;
  beforeEach(async () => {
    db = await testDb();
  });

  it("signs in, creates the user once, and resolves the session", async () => {
    const first = await signIn(db, await signedMessage(await issueNonce(db)), opts);
    expect(first.user.address).toBe(account.address.toLowerCase());
    expect((await getSessionUser(db, first.token))?.id).toBe(first.user.id);

    const second = await signIn(db, await signedMessage(await issueNonce(db)), opts);
    expect(second.user.id).toBe(first.user.id);
    expect(second.token).not.toBe(first.token);
  });

  it("stores only a hash of the token", async () => {
    const { token } = await signIn(db, await signedMessage(await issueNonce(db)), opts);
    const rows = await db.select().from(sessions);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toContain(token);
  });

  it("rejects a replayed message", async () => {
    const signed = await signedMessage(await issueNonce(db));
    await signIn(db, signed, opts);
    await expect(signIn(db, signed, opts)).rejects.toMatchObject({ code: "nonce" });
  });

  it("rejects a nonce it never issued, or one that expired", async () => {
    await expect(signIn(db, await signedMessage("abcdefgh12345678"), opts)).rejects.toMatchObject({ code: "nonce" });
    const t0 = new Date("2026-11-27T12:00:00Z");
    const nonce = await issueNonce(db, t0);
    const late = new Date(t0.getTime() + NONCE_TTL_MS + 1);
    await expect(signIn(db, await signedMessage(nonce, { issuedAt: t0 }), { ...opts, now: late })).rejects.toMatchObject({ code: "nonce" });
  });

  it("rejects another site's domain and another chain", async () => {
    const nonce = await issueNonce(db);
    await expect(signIn(db, await signedMessage(nonce, { domain: "evil.test" }), opts)).rejects.toMatchObject({ code: "wrong-domain" });
    await expect(signIn(db, await signedMessage(nonce, { chainId: 1 }), opts)).rejects.toMatchObject({ code: "wrong-chain" });
  });

  it("rejects an expired message", async () => {
    const nonce = await issueNonce(db);
    const signed = await signedMessage(nonce, { expirationTime: new Date(Date.now() - 1000) });
    await expect(signIn(db, signed, opts)).rejects.toMatchObject({ code: "expired" });
  });

  it("rejects a bad signature and burns the nonce", async () => {
    const nonce = await issueNonce(db);
    const { message } = await signedMessage(nonce);
    const other = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
    const signature = await other.signMessage({ message });
    await expect(signIn(db, { message, signature }, opts)).rejects.toMatchObject({ code: "signature" });
    await expect(signIn(db, await signedMessage(nonce), opts)).rejects.toMatchObject({ code: "nonce" });
  });

  it("expires sessions and signs out", async () => {
    const t0 = new Date();
    const { token } = await signIn(db, await signedMessage(await issueNonce(db, t0)), { ...opts, now: t0 });
    expect(await getSessionUser(db, token, new Date(t0.getTime() + SESSION_TTL_MS + 1))).toBeNull();
    expect(await getSessionUser(db, token, t0)).not.toBeNull();
    await signOut(db, token);
    expect(await getSessionUser(db, token, t0)).toBeNull();
    expect(await getSessionUser(db, undefined)).toBeNull();
  });
});
