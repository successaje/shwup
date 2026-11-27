"use client";

import { ArrowUpRight, Wallet } from "lucide-react";
import { useState } from "react";
import { useConnect, useConnectors } from "wagmi";
import { Spinner } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { WalletConnectOption } from "@/components/wallet/walletconnect-option";
import { toFriendlyError } from "@/lib/errors";

/** A dialog for connecting a wallet, for flows that only need one (holding a spot, creating an event). */
export function ConnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Connect a wallet"
      description="ShwUp never holds your money. Deposits sit in a public contract until they're returned."
    >
      {open && <WalletList onConnected={() => onOpenChange(false)} />}
    </Dialog>
  );
}

/**
 * Lists wallets announced via EIP-6963. The generic `injected` connector is only shown when no
 * named wallet announced itself (older wallets, some mobile in-app browsers).
 */
export function WalletList({ onConnected }: { onConnected?: () => void }) {
  const connectors = useConnectors();
  const { connect, isPending, variables, error } = useConnect({
    mutation: { onSuccess: () => onConnected?.() },
  });

  const [wcExpanded, setWcExpanded] = useState(false);

  const wc = connectors.find((c) => c.id === "walletConnect");
  const injected = connectors.filter((c) => c.id !== "walletConnect");
  const named = injected.filter((c) => c.id !== "injected");
  const hasGenericInjected = typeof window !== "undefined" && "ethereum" in window;
  const list = named.length > 0 ? named : hasGenericInjected ? injected : [];
  const friendly = error ? toFriendlyError(error) : null;
  const noBrowserWallet = list.length === 0;

  // One flat, keyed column. The WalletConnect option keeps the same key in every state, so React
  // never remounts it (which would drop its pairing code); its neighbours are hidden around it.
  return (
    <>
      <div className="flex flex-col gap-2">
        {!wcExpanded &&
          list.map((c) => {
            const pending = isPending && variables?.connector === c;
            return (
              <button
                key={c.uid}
                onClick={() => connect({ connector: c })}
                disabled={isPending}
                className="flex h-14 w-full items-center gap-3 rounded-md border border-line-strong bg-surface px-4 text-left transition-colors hover:border-ink-3 hover:bg-sunken/40 disabled:opacity-60"
              >
                {c.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data: URIs from EIP-6963
                  <img src={c.icon} alt="" className="size-7 rounded-sm" />
                ) : (
                  <span className="grid size-7 place-items-center rounded-sm bg-sunken">
                    <Wallet className="size-4 text-ink-2" />
                  </span>
                )}
                <span className="flex-1 font-medium">{c.id === "injected" ? "Browser wallet" : c.name}</span>
                {pending && <span className="flex items-center gap-2 text-sm text-ink-2"><Spinner />Check your wallet</span>}
              </button>
            );
          })}
        {wc && <WalletConnectOption key="walletconnect" connector={wc} onConnected={onConnected} onExpandedChange={setWcExpanded} />}
        {!wcExpanded && noBrowserWallet && (wc ? <NoWallet key="hint" compact /> : <NoWallet key="hint" />)}
      </div>

      {friendly && (
        <p role="alert" className="mt-3 rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">
          {friendly.kind === "rejected" ? "Connection cancelled in your wallet." : friendly.detail}
        </p>
      )}
    </>
  );
}

/** MetaMask's universal link that opens a page inside the MetaMask app's browser. */
export function metamaskDappLink(href: string): string {
  return `https://metamask.app.link/dapp/${href.replace(/^https?:\/\//, "")}`;
}

function NoWallet({ compact = false }: { compact?: boolean }) {
  // Phones have no wallet extension: the page has to open inside the wallet app's own browser.
  const mobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  const here = typeof window !== "undefined" ? window.location.href : "";

  // Under the WalletConnect option, one quiet line is enough.
  if (compact) {
    return mobile ? (
      <a href={metamaskDappLink(here)} className="text-center text-sm text-ink-2 underline decoration-line-strong underline-offset-4 hover:text-ink">
        Or open ShwUp inside MetaMask&apos;s browser
      </a>
    ) : (
      <p className="text-center text-xs text-ink-3">
        Prefer a browser extension?{" "}
        <a href="https://metamask.io/download" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-ink">
          Get MetaMask
        </a>
      </p>
    );
  }

  if (mobile) {
    return (
      <div className="flex flex-col gap-4 text-sm text-ink-2">
        <p>
          Phone browsers can&apos;t reach your wallet app directly. Open this page inside your wallet&apos;s browser and
          connect from there.
        </p>
        <a
          href={metamaskDappLink(here)}
          className="flex h-12 items-center justify-center rounded-md bg-ink font-medium text-paper transition-opacity hover:opacity-90"
        >
          Open in MetaMask
        </a>
        <p className="text-xs text-ink-3">
          Using another wallet (Rabby, Coinbase, Trust)? Open its browser tab and go to{" "}
          <span className="num text-ink-2">{here.replace(/^https?:\/\//, "")}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-ink-2">
      <p>We couldn&apos;t find a wallet in this browser. Install a wallet extension (MetaMask, Rabby) and refresh.</p>
      <a
        href="https://metamask.io/download"
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 self-start font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink"
      >
        Get MetaMask <ArrowUpRight className="size-3.5" />
      </a>
    </div>
  );
}
