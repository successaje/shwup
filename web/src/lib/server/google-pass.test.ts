import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ForfeitPolicy, type ShwUpEvent } from "@/domain/event";
import { walletPassContent } from "@/domain/wallet-pass";
import { googleSaveUrl } from "./google-pass";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const config = {
  issuerId: "3388000000000000000",
  clientEmail: "wallet@shwup-test.iam.gserviceaccount.com",
  privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
};

const event: ShwUpEvent = {
  id: 3n,
  organizer: "0x0000000000000000000000000000000000000001",
  deposit: 5n * 10n ** 18n,
  startsAt: new Date("2026-10-10T18:30:00Z"),
  cancelCutoff: new Date("2026-10-09T18:30:00Z"),
  checkInEndsAt: new Date("2026-10-10T21:30:00Z"),
  capacity: 0,
  held: 1,
  checkedIn: 0,
  forfeitPolicy: ForfeitPolicy.Attendees,
  cancelled: false,
  settled: false,
  bonusPerAttendee: 0n,
  beneficiary: "0x0000000000000000000000000000000000000000",
  bond: 0n,
  bondPerGuest: 0n,
  details: { name: "Arc Builders Night with a deliberately long name to stress the link length", location: "The Workshop, 14 Herbert Macaulay Way, Yaba, Lagos" },
};
const content = walletPassContent({
  event,
  holder: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  holderName: "Ada Obi",
  origin: "https://shwup.vercel.app",
  chainId: 5042002,
  contract: "0x191e7817E6fAafF2169660e6F13f2f3197ecBC9C",
});

const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString());
const verifies = (jwt: string) => {
  const [h, p, s] = jwt.split(".");
  return createVerify("RSA-SHA256").update(`${h}.${p}`).verify(publicKey, Buffer.from(s, "base64url"));
};

/** A stand-in for Google: records calls; the object already exists, so insert returns 409. */
function fakeGoogle() {
  const calls: { url: string; method: string; body: string }[] = [];
  const fetcher = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method ?? "GET", body: String(init.body) });
    if (url.includes("oauth2")) return Response.json({ access_token: "ya29.test", expires_in: 3600 });
    if (url.endsWith("/eventTicketObject") && init.method === "POST") return new Response("exists", { status: 409 });
    return Response.json({});
  }) as typeof fetch;
  return { calls, fetcher };
}

describe("googleSaveUrl", () => {
  it("writes the pass through the API, then links to it by id", async () => {
    const google = fakeGoogle();
    const url = await googleSaveUrl(content, config, "https://shwup.vercel.app", google.fetcher);

    const [tokenCall, classCall, objectInsert, objectPatch] = google.calls;
    const assertion = new URLSearchParams(tokenCall.body).get("assertion")!;
    expect(verifies(assertion)).toBe(true);
    expect(decode(assertion.split(".")[1])).toMatchObject({ scope: "https://www.googleapis.com/auth/wallet_object.issuer", aud: "https://oauth2.googleapis.com/token" });

    expect(classCall).toMatchObject({ method: "POST", url: "https://walletobjects.googleapis.com/walletobjects/v1/eventTicketClass" });
    expect(JSON.parse(classCall.body).id).toBe("3388000000000000000.shwup-5042002-191e7817-3");
    expect(objectInsert.method).toBe("POST");
    expect(objectPatch.method).toBe("PATCH"); // already existed: updated in place
    expect(objectPatch.url).toContain("/eventTicketObject/3388000000000000000.shwup-5042002-191e7817-3-");
    expect(JSON.parse(objectPatch.body).barcode.value).toBe(content.barcode);

    const jwt = url.replace("https://pay.google.com/gp/v/save/", "");
    expect(verifies(jwt)).toBe(true);
    expect(decode(jwt.split(".")[1]).payload).toEqual({ eventTicketObjects: [{ id: JSON.parse(objectPatch.body).id }] });
    expect(jwt.length).toBeLessThan(1800); // Google's safe limit for save links
  });

  it("reuses the access token", async () => {
    const google = fakeGoogle();
    await googleSaveUrl(content, config, "https://shwup.vercel.app", google.fetcher);
    expect(google.calls.some((c) => c.url.includes("oauth2"))).toBe(false);
  });

  it("fails loudly when Google rejects the pass", async () => {
    const fetcher = (async (url: string) =>
      url.includes("oauth2") ? Response.json({ access_token: "x", expires_in: 3600 }) : new Response("bad class", { status: 400 })) as typeof fetch;
    await expect(googleSaveUrl(content, { ...config, clientEmail: "other@x.iam.gserviceaccount.com" }, "https://shwup.vercel.app", fetcher)).rejects.toThrow(
      /eventTicketClass upsert failed: 400/,
    );
  });
});
