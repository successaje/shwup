import "server-only";
import { createSign } from "node:crypto";
import type { WalletPassContent } from "@/domain/wallet-pass";
import type { GoogleWalletConfig } from "@/lib/server/wallet-config";

const API = "https://walletobjects.googleapis.com/walletobjects/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

const text = (value: string) => ({ defaultValue: { language: "en-US", value } });
const b64url = (data: string | Buffer) => Buffer.from(data).toString("base64url");

function signJwt(claims: object, privateKey: string): string {
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify(claims))}`;
  return `${unsigned}.${b64url(createSign("RSA-SHA256").update(unsigned).sign(privateKey))}`;
}

/** The event ticket class (one per event) and object (one per holder) for a held spot. */
export function googlePassResources(c: WalletPassContent, config: GoogleWalletConfig, origin: string) {
  const classId = `${config.issuerId}.${c.eventKey}`;
  return {
    eventTicketClass: {
      id: classId,
      issuerName: "ShwUp",
      reviewStatus: "UNDER_REVIEW",
      eventName: text(c.eventName),
      venue: { name: text(c.location || c.eventName), address: text(c.location || "See ticket page") },
      dateTime: { start: c.startsAt.toISOString(), end: c.checkInEndsAt.toISOString() },
      logo: { sourceUri: { uri: `${origin}/icons/192` }, contentDescription: text("ShwUp") },
      hexBackgroundColor: "#18170f",
    },
    eventTicketObject: {
      id: `${config.issuerId}.${c.serial}`,
      classId,
      state: "ACTIVE",
      ...(c.holderName ? { ticketHolderName: c.holderName } : {}),
      barcode: { type: "QR_CODE", value: c.barcode, alternateText: "Show at the door" },
      validTimeInterval: { end: { date: c.checkInEndsAt.toISOString() } },
      textModulesData: [
        { id: "deposit", header: `${c.deposit} deposit held`, body: `${c.promise}.` },
        { id: "how", header: "How your deposit works", body: c.terms },
      ],
      linksModuleData: { uris: [{ uri: c.pageUrl, description: "Open your ticket in ShwUp", id: "page" }] },
    },
  };
}

/** OAuth access token for the Wallet REST API, from the service account (cached until near expiry). */
let token: { value: string; expires: number; email: string } | undefined;
async function accessToken(config: GoogleWalletConfig, fetcher: typeof fetch): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (token && token.email === config.clientEmail && token.expires - 60 > now) return token.value;
  const assertion = signJwt({ iss: config.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }, config.privateKey);
  const res = await fetcher(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`Google token request failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  token = { value: body.access_token, expires: now + body.expires_in, email: config.clientEmail };
  return token.value;
}

/** Insert, or update in place if it already exists (re-adding a pass, edited event details). */
async function upsert(kind: "eventTicketClass" | "eventTicketObject", resource: { id: string }, auth: string, fetcher: typeof fetch) {
  const headers = { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" };
  const body = JSON.stringify(resource);
  let res = await fetcher(`${API}/${kind}`, { method: "POST", headers, body });
  if (res.status === 409) res = await fetcher(`${API}/${kind}/${encodeURIComponent(resource.id)}`, { method: "PATCH", headers, body });
  if (!res.ok) throw new Error(`Google ${kind} upsert failed: ${res.status} ${await res.text()}`);
}

/**
 * A "Save to Google Wallet" link. The class and object are written through the REST API first, so
 * the signed link only carries the object id — Google's safe limit for the whole JWT is 1,800 characters.
 */
export async function googleSaveUrl(c: WalletPassContent, config: GoogleWalletConfig, origin: string, fetcher: typeof fetch = fetch): Promise<string> {
  const { eventTicketClass, eventTicketObject } = googlePassResources(c, config, origin);
  const auth = await accessToken(config, fetcher);
  await upsert("eventTicketClass", eventTicketClass, auth, fetcher);
  await upsert("eventTicketObject", eventTicketObject, auth, fetcher);
  const jwt = signJwt(
    {
      iss: config.clientEmail,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      origins: [origin],
      payload: { eventTicketObjects: [{ id: eventTicketObject.id }] },
    },
    config.privateKey,
  );
  return `https://pay.google.com/gp/v/save/${jwt}`;
}
