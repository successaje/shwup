"use client";

import { ArrowLeft, Check, Copy, Smartphone } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Connector } from "wagmi";
import { useConnect } from "wagmi";
import { QrCode } from "@/components/qr-code";
import { Spinner } from "@/components/ui/button";
import { toFriendlyError } from "@/lib/errors";
import { isMobileUserAgent, walletAppLinks } from "@/lib/walletconnect-links";

const noop = () => () => {};

/**
 * "Phone wallet" via WalletConnect. On a computer it shows a QR code to scan with any wallet app;
 * on a phone it offers buttons that open the wallet app directly. Calls `onConnected` when paired.
 */
export function WalletConnectOption({
  connector,
  onConnected,
  onExpandedChange,
}: {
  connector: Connector;
  onConnected?: () => void;
  /** True while the QR code / app picker is showing, so the caller can hide the other wallets. */
  onExpandedChange?: (expanded: boolean) => void;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const mobile = useSyncExternalStore(noop, () => isMobileUserAgent(navigator.userAgent), () => false);
  const { connect, isPending, error, reset } = useConnect({ mutation: { onSuccess: () => onConnected?.() } });

  // The connector announces its pairing URI as a message; that's what the QR code encodes.
  useEffect(() => {
    const onMessage = ({ type, data }: { type: string; data?: unknown }) => {
      if (type === "display_uri" && typeof data === "string") setUri(data);
    };
    connector.emitter.on("message", onMessage);
    return () => connector.emitter.off("message", onMessage);
  }, [connector]);

  const start = () => {
    setUri(null);
    reset();
    connect({ connector });
  };

  const back = () => {
    setUri(null);
    reset();
  };

  const friendly = error ? toFriendlyError(error) : null;
  const expanded = Boolean(uri && isPending);
  useEffect(() => onExpandedChange?.(expanded), [expanded, onExpandedChange]);

  if (expanded && uri) {
    return (
      <div className="flex animate-rise flex-col gap-4">
        <button onClick={back} className="inline-flex items-center gap-1.5 self-start text-sm text-ink-2 hover:text-ink">
          <ArrowLeft className="size-4" /> All wallets
        </button>
        {mobile ? <OpenInApp uri={uri} /> : <ScanCode uri={uri} />}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={start}
        disabled={isPending}
        className="flex h-14 w-full items-center gap-3 rounded-md border border-line-strong bg-surface px-4 text-left transition-colors hover:border-ink-3 hover:bg-sunken/40 disabled:opacity-60"
      >
        <span className="grid size-7 place-items-center rounded-sm bg-[#3b99fc] text-white">
          <Smartphone className="size-4" />
        </span>
        <span className="flex-1">
          <span className="block font-medium">Phone wallet</span>
          <span className="block text-xs text-ink-3">{mobile ? "MetaMask, Trust, Rainbow and more" : "Scan a QR code · WalletConnect"}</span>
        </span>
        {isPending && <Spinner className="text-ink-2" />}
      </button>
      {friendly && !isPending && (
        <p role="alert" className="mt-2 rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">
          {friendly.kind === "rejected" ? "Connection cancelled in your wallet." : friendly.detail}
        </p>
      )}
    </>
  );
}

function ScanCode({ uri }: { uri: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="rounded-lg border border-line bg-[#fbfaf5] p-3">
        <QrCode value={uri} label="WalletConnect QR code" className="size-56 p-0" />
      </div>
      <div>
        <p className="font-medium">Scan with your wallet app</p>
        <p className="mt-1 text-sm text-ink-2">Open MetaMask, Trust, Rainbow or any WalletConnect wallet and scan. Then approve on your phone.</p>
      </div>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(uri);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        }}
        className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink"
      >
        {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy link instead"}
      </button>
    </div>
  );
}

function OpenInApp({ uri }: { uri: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-2">Pick your wallet. It opens, asks you to connect, then sends you back here.</p>
      {walletAppLinks(uri).map((w) => (
        <a
          key={w.name}
          href={w.href}
          className="flex h-12 items-center justify-center rounded-md border border-line-strong bg-surface font-medium transition-colors hover:border-ink-3"
        >
          {w.name}
        </a>
      ))}
      <a href={uri} className="text-center text-sm text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
        Another wallet
      </a>
    </div>
  );
}
