"use client";

import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { EIP1193Provider } from "viem";
import { useConnection } from "wagmi";
import { Button } from "@/components/ui/button";
import { BRIDGE_SOURCES, bridgeAmount, type BridgeSource } from "@/domain/bridge";
import { bridgeToArc, estimateBridgeFee, type BridgeProgress } from "@/lib/bridge-usdc";
import { cn } from "@/lib/cn";
import { toFriendlyError } from "@/lib/errors";

const STEP_LABEL: Record<string, string> = {
  approve: "Approve USDC",
  burn: "Send from your chain",
  fetchAttestation: "Circle confirms the transfer",
  mint: "Arrives on Arc",
};

/**
 * Bring USDC to Arc from another chain without leaving the invite: Circle's CCTP burns it on the
 * source chain and mints native USDC on Arc. Only needs gas on the source chain.
 */
export function BridgePanel({ need, balance }: { need: bigint; balance: bigint }) {
  const { address, connector } = useConnection();
  const [source, setSource] = useState<BridgeSource>("Base");
  // Keyed by route so a stale estimate never shows for a different chain or amount.
  const [estimate, setEstimate] = useState<{ route: string; fee: string } | null>(null);
  const [steps, setSteps] = useState<BridgeProgress[]>([]);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const amount = bridgeAmount(need, balance);
  const route = `${source}:${amount}:${address}`;
  const fee = estimate?.route === route ? estimate.fee : null;

  const provider = async () => (await connector?.getProvider()) as EIP1193Provider | undefined;

  useEffect(() => {
    let live = true;
    (async () => {
      const p = await provider();
      if (!p || !address) return;
      try {
        const f = await estimateBridgeFee(p, source, amount, address);
        if (live) setEstimate({ route, fee: f });
      } catch {
        // estimates are a nicety; the transfer itself reports real errors
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-estimate when the route changes
  }, [route]);

  const go = async () => {
    const p = await provider();
    if (!p || !address) return;
    setState("working");
    setError(null);
    setSteps([]);
    try {
      const r = await bridgeToArc({ provider: p, source, amount, recipient: address, onProgress: setSteps });
      setState(r.ok ? "done" : "error");
      if (!r.ok) setError("The transfer didn't finish. Nothing is lost — check the steps below or try again.");
    } catch (e) {
      const f = toFriendlyError(e);
      setState("error");
      setError(f.kind === "rejected" ? "Cancelled in your wallet." : `${f.title}. ${f.detail}`);
    }
  };

  return (
    <div className="mt-3 rounded-md border border-line bg-surface p-3">
      <p className="font-medium">Bring it from another chain</p>
      <p className="mt-0.5 text-ink-2">
        Have USDC on Base, Ethereum or another chain? Move ${amount} here with Circle&apos;s bridge. You only need gas on that chain.
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Bring USDC from">
        {BRIDGE_SOURCES.map((s) => (
          <button
            key={s.key}
            role="radio"
            aria-checked={source === s.key}
            disabled={state === "working"}
            onClick={() => setSource(s.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              source === s.key ? "border-ink bg-ink text-paper" : "border-line-strong text-ink-2 hover:border-ink-3",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <Button size="sm" className="mt-3" block loading={state === "working"} disabled={state === "done"} onClick={go}>
        {state === "done" ? "Arrived on Arc" : `Bring $${amount} from ${source}`}
      </Button>
      <p className="mt-2 text-xs text-ink-3">
        {fee !== null ? `Circle's fee: about $${fee}, taken from the amount. ` : ""}
        Your wallet will ask you to switch to {source} and approve.
      </p>
      {steps.length > 0 && (
        <ol className="mt-3 flex flex-col gap-1.5 text-xs" aria-live="polite">
          {steps.map((s) => (
            <li key={s.step} className="flex items-center gap-2">
              {s.state === "success" || s.state === "noop" ? (
                <Check className="size-3.5 text-ok" />
              ) : s.state === "error" ? (
                <span className="size-3.5 text-center text-danger">!</span>
              ) : (
                <Loader2 className="size-3.5 animate-spin text-ink-3" />
              )}
              <span>{STEP_LABEL[s.step] ?? s.step}</span>
              {s.explorerUrl && (
                <a href={s.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-ink-3 hover:text-ink">
                  view <ArrowUpRight className="size-3" />
                </a>
              )}
            </li>
          ))}
        </ol>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
