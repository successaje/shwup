import "server-only";
import { PKPass } from "passkit-generator";
import type { WalletPassContent } from "@/domain/wallet-pass";
import { renderAppIcon } from "@/lib/app-icon";
import type { AppleWalletConfig } from "@/lib/server/wallet-config";

const png = async (size: number, pad: number) => Buffer.from(await renderAppIcon(size, pad).arrayBuffer());

/** Brand images every pass needs, rendered once per server instance. */
let images: Promise<Record<string, Buffer>> | undefined;
function passImages() {
  images ??= (async () => ({
    "icon.png": await png(29, 0.12),
    "icon@2x.png": await png(58, 0.12),
    "icon@3x.png": await png(87, 0.12),
    "logo.png": await png(50, 0.12),
    "logo@2x.png": await png(100, 0.12),
    "logo@3x.png": await png(150, 0.12),
  }))();
  return images;
}

const date = (key: string, label: string, d: Date) => ({
  key,
  label,
  value: d.toISOString(),
  dateStyle: "PKDateStyleMedium",
  timeStyle: "PKDateStyleShort",
});

/** A signed Apple Wallet event ticket (.pkpass) for one held spot. */
export async function buildApplePass(c: WalletPassContent, config: AppleWalletConfig, contractLine: string): Promise<Buffer> {
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    serialNumber: c.serial,
    organizationName: "ShwUp",
    description: `ShwUp ticket: ${c.eventName}`,
    logoText: "ShwUp",
    foregroundColor: "rgb(24, 23, 15)",
    backgroundColor: "rgb(244, 241, 232)",
    labelColor: "rgb(217, 72, 31)",
    sharingProhibited: true,
    eventTicket: {
      headerFields: [{ key: "held", label: "HELD", value: c.deposit }],
      primaryFields: [{ key: "event", label: "EVENT", value: c.eventName }],
      secondaryFields: [date("when", "WHEN", c.startsAt), { key: "where", label: "WHERE", value: c.location || "—" }],
      auxiliaryFields: [
        { key: "deposit", label: "YOUR DEPOSIT", value: `${c.deposit} · ${c.promise.toLowerCase()}` },
        { key: "guest", label: "GUEST", value: c.holderName ?? `${c.holder.slice(0, 6)}…${c.holder.slice(-4)}` },
      ],
      backFields: [
        { key: "how", label: "How your deposit works", value: c.terms },
        date("cutoff", "Cancel for a full refund until", c.cancelCutoff),
        date("doors", "Check-in closes", c.checkInEndsAt),
        { key: "page", label: "Your ticket page", value: c.pageUrl, attributedValue: `<a href="${c.pageUrl}">Open in ShwUp</a>` },
        { key: "contract", label: "Contract", value: contractLine },
      ],
    },
  };

  const pass = new PKPass(
    { "pass.json": Buffer.from(JSON.stringify(passJson)), ...(await passImages()) },
    { wwdr: config.wwdr, signerCert: config.signerCert, signerKey: config.signerKey, signerKeyPassphrase: config.signerKeyPassphrase },
  );
  pass.setBarcodes({ format: "PKBarcodeFormatQR", message: c.barcode, messageEncoding: "iso-8859-1", altText: "Show at the door" });
  pass.setRelevantDate(c.startsAt); // surfaces on the lock screen around the start time
  pass.setExpirationDate(c.checkInEndsAt); // greys out once check-in has closed
  return pass.getAsBuffer();
}
