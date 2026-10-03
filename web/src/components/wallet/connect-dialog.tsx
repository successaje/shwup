"use client";

import { ArrowUpRight, Wallet } from "lucide-react";
import { useConnect, useConnectors } from "wagmi";
import { Spinner } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toFriendlyError } from "@/lib/errors";

/**
 * Lists wallets announced via EIP-6963. The generic `injected` connector is only shown when no
 * named wallet announced itself (older wallets, some mobile in-app browsers).
 */
export function ConnectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const connectors = useConnectors();
  const { connect, isPending, variables, error, reset } = useConnect({
    mutation: { onSuccess: () => onOpenChange(false) },
  });

  const named = connectors.filter((c) => c.id !== "injected");
  const hasGenericInjected = typeof window !== "undefined" && "ethereum" in window;
  const list = named.length > 0 ? named : hasGenericInjected ? connectors : [];
  const friendly = error ? toFriendlyError(error) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Connect a wallet"
      description="ShwUp never holds your money. Deposits sit in a public contract until they're returned."
    >
      {list.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {list.map((c) => {
            const pending = isPending && variables?.connector === c;
            return (
              <li key={c.uid}>
                <button
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
              </li>
            );
          })}
        </ul>
      ) : (
        <NoWallet />
      )}

      {friendly && (
        <p role="alert" className="mt-3 rounded-sm bg-danger-soft px-3 py-2 text-sm text-danger">
          {friendly.kind === "rejected" ? "Connection cancelled in your wallet." : friendly.detail}
        </p>
      )}
    </Dialog>
  );
}

function NoWallet() {
  return (
    <div className="flex flex-col gap-4 text-sm text-ink-2">
      <p>
        We couldn&apos;t find a wallet in this browser. On a phone, open this page inside your wallet app&apos;s browser
        (MetaMask, Rabby, Phantom). On a computer, install a wallet extension and refresh.
      </p>
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
