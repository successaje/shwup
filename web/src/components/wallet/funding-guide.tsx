"use client";

import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useState } from "react";
import { useBalance, useConnection, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { BridgePanel } from "@/components/wallet/bridge-panel";
import { chain, chainKey, fundingUrl } from "@/config/chain";
import { cn } from "@/lib/cn";
import { toFriendlyError } from "@/lib/errors";
import { formatUsd } from "@/lib/money";

/**
 * Walks a guest from "I have a wallet" to "I have enough USDC on Arc": add the network, copy the
 * address, get USDC, and watch the balance arrive without leaving the page.
 */
export function FundingGuide({ need, open, onOpenChange }: { need: bigint; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { address, chainId } = useConnection();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const { data: balance } = useBalance({ address, chainId: chain.id, query: { enabled: open && !!address, refetchInterval: 4_000 } });
  const [copied, setCopied] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const onArc = chainId === chain.id;
  const funded = balance !== undefined && balance.value >= need;

  const addNetwork = async () => {
    setNetworkError(null);
    try {
      await switchChainAsync({ chainId: chain.id }); // wallets that don't know Arc are asked to add it
    } catch (e) {
      const f = toFriendlyError(e);
      setNetworkError(f.kind === "rejected" ? "Cancelled in your wallet." : "Your wallet couldn't add Arc. Add it manually with the details below.");
    }
  };

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Get USDC on ${chain.name}`} description={`You need ${formatUsd(need)} to hold this spot, plus a fraction of a cent for the network.`}>
      <ol className="flex flex-col gap-5">
        <Step n={1} done={onArc} title={`Add ${chain.name} to your wallet`}>
          {onArc ? (
            <p className="text-ink-2">Your wallet is on {chain.name}.</p>
          ) : (
            <>
              <Button size="sm" variant="secondary" loading={switching} onClick={addNetwork} className="mt-2">
                Add {chain.name}
              </Button>
              {networkError && <p className="mt-2 text-danger">{networkError}</p>}
              <p className="num mt-2 text-xs text-ink-3">
                Chain ID {chain.id} · RPC {chain.rpcUrls.default.http[0]} · currency USDC
              </p>
            </>
          )}
        </Step>

        <Step n={2} done={funded} title="Send USDC to this address">
          <div className="mt-2 flex items-center gap-2">
            <code className="num min-w-0 flex-1 truncate rounded-sm bg-sunken px-3 py-2 text-xs">{address}</code>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          {chainKey === "arcTestnet" && fundingUrl ? (
            <p className="mt-2 text-ink-2">
              Open the{" "}
              <a href={fundingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-ink underline underline-offset-4">
                Circle faucet <ArrowUpRight className="size-3.5" />
              </a>
              , choose <b>Arc Testnet</b>, paste your address. Test USDC arrives in seconds.
            </p>
          ) : (
            <p className="mt-2 text-ink-2">
              From an exchange or another wallet, withdraw USDC choosing the <b>Arc</b> network.
              {fundingUrl && (
                <>
                  {" "}
                  <a href={fundingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-ink underline underline-offset-4">
                    About USDC <ArrowUpRight className="size-3.5" />
                  </a>
                </>
              )}
            </p>
          )}
          {chainKey === "arc" && !funded && <BridgePanel need={need} balance={balance?.value ?? 0n} />}
        </Step>

        <Step n={3} done={funded} title="Come back here">
          <div
            className={cn("mt-2 rounded-md px-3 py-2.5", funded ? "bg-ok-soft text-ok" : "bg-sunken text-ink-2")}
            aria-live="polite"
          >
            {balance === undefined
              ? "Checking your balance…"
              : funded
                ? `You have ${formatUsd(balance.value)} — enough to hold your spot.`
                : `Balance: ${formatUsd(balance.value)}. This updates by itself while you wait.`}
          </div>
        </Step>
      </ol>
      <Button className="mt-6" block disabled={!funded} onClick={() => onOpenChange(false)}>
        {funded ? "Continue" : "Waiting for USDC…"}
      </Button>
    </Dialog>
  );
}

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm">
      <span
        className={cn(
          "num grid size-6 shrink-0 place-items-center rounded-full border text-xs",
          done ? "border-ok bg-ok text-white dark:text-sunken" : "border-line-strong text-ink-2",
        )}
      >
        {done ? <Check className="size-3.5" /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {children}
      </div>
    </li>
  );
}
