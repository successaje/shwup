/** Deep links that open a WalletConnect pairing URI in a specific wallet app on a phone. */
export type WalletAppLink = { name: string; href: string };

export function walletAppLinks(uri: string): WalletAppLink[] {
  const u = encodeURIComponent(uri);
  return [
    { name: "MetaMask", href: `https://metamask.app.link/wc?uri=${u}` },
    { name: "Trust Wallet", href: `https://link.trustwallet.com/wc?uri=${u}` },
    { name: "Rainbow", href: `https://rnbwapp.com/wc?uri=${u}` },
  ];
}

/** True on phones and tablets, where a QR code can't be scanned by the same device. */
export function isMobileUserAgent(ua: string): boolean {
  return /android|iphone|ipad|ipod/i.test(ua);
}
