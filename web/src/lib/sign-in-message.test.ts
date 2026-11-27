import { verifyMessage } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { describe, expect, it } from "vitest";
import { issueNonce, signIn } from "@/lib/server/auth/session";
import { testDb } from "@/test/db";
import { safeNext, signInMessage } from "./sign-in-message";

const account = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");

describe("signInMessage", () => {
  it("is accepted by the server for the same origin and chain", async () => {
    const db = await testDb();
    const message = signInMessage({ address: account.address, chainId: 5042, nonce: await issueNonce(db), origin: "https://shwup.vercel.app" });
    expect(message).toContain("It doesn't move any money");
    const signature = await account.signMessage({ message });
    const { user } = await signIn(db, { message, signature }, { domain: "shwup.vercel.app", chainId: 5042, verify: (a) => verifyMessage(a) });
    expect(user.address).toBe(account.address.toLowerCase());
  });

  it("keeps the port in the domain for local development", () => {
    const message = signInMessage({ address: account.address, chainId: 31337, nonce: "abcdefgh12345678", origin: "http://localhost:3100" });
    expect(message.startsWith("localhost:3100 wants you to sign in")).toBe(true);
  });
});

describe("safeNext", () => {
  it("allows only paths on this site", () => {
    expect(safeNext("/app/settings")).toBe("/app/settings");
    expect(safeNext("/e/4?x=1")).toBe("/e/4?x=1");
    expect(safeNext("https://evil.test")).toBe("/app");
    expect(safeNext("//evil.test")).toBe("/app");
    expect(safeNext("/\\evil.test")).toBe("/app");
    expect(safeNext(null, "/")).toBe("/");
  });
});
