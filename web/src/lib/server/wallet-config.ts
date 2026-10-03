import "server-only";

/**
 * Wallet pass credentials, from server-only environment variables. Each wallet is optional: the
 * "Add to … Wallet" button only appears when its credentials are present.
 *
 * Apple (Apple Developer account → Identifiers → Pass Type IDs → certificate):
 *   APPLE_PASS_TYPE_ID        e.g. pass.app.shwup.ticket
 *   APPLE_TEAM_ID             10-character team id
 *   APPLE_PASS_CERT           base64 of the pass certificate, PEM
 *   APPLE_PASS_KEY            base64 of its private key, PEM
 *   APPLE_PASS_KEY_PASSPHRASE optional
 *   APPLE_WWDR_CERT           base64 of Apple's WWDR G4 intermediate certificate, PEM
 *
 * Google (Google Pay & Wallet Console issuer + a Cloud service account with Wallet API access):
 *   GOOGLE_WALLET_ISSUER_ID       numeric issuer id
 *   GOOGLE_WALLET_SERVICE_ACCOUNT base64 of the service account's JSON key
 */

const b64 = (name: string) => {
  const v = process.env[name]?.trim();
  return v ? Buffer.from(v, "base64").toString("utf8") : undefined;
};

export type AppleWalletConfig = {
  passTypeIdentifier: string;
  teamIdentifier: string;
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase?: string;
  wwdr: string;
};

export function appleWalletConfig(): AppleWalletConfig | null {
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_ID?.trim();
  const teamIdentifier = process.env.APPLE_TEAM_ID?.trim();
  const signerCert = b64("APPLE_PASS_CERT");
  const signerKey = b64("APPLE_PASS_KEY");
  const wwdr = b64("APPLE_WWDR_CERT");
  if (!passTypeIdentifier || !teamIdentifier || !signerCert || !signerKey || !wwdr) return null;
  return { passTypeIdentifier, teamIdentifier, signerCert, signerKey, wwdr, signerKeyPassphrase: process.env.APPLE_PASS_KEY_PASSPHRASE || undefined };
}

export type GoogleWalletConfig = { issuerId: string; clientEmail: string; privateKey: string };

export function googleWalletConfig(): GoogleWalletConfig | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  const raw = b64("GOOGLE_WALLET_SERVICE_ACCOUNT");
  if (!issuerId || !raw) return null;
  try {
    const key = JSON.parse(raw) as { client_email?: string; private_key?: string };
    if (!key.client_email || !key.private_key) return null;
    return { issuerId, clientEmail: key.client_email, privateKey: key.private_key };
  } catch {
    return null;
  }
}

/** Which buttons to show. Safe to send to the browser: booleans only. */
export function walletAvailability() {
  return { apple: appleWalletConfig() !== null, google: googleWalletConfig() !== null };
}
export type WalletAvailability = ReturnType<typeof walletAvailability>;
