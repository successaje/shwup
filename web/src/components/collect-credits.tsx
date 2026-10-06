"use client";

import { zeroAddress, type Address } from "viem";
import { useReadContract } from "wagmi";
import { TxProgress } from "@/components/tx-progress";
import { Button } from "@/components/ui/button";
import { isConfigured, shwupContract } from "@/hooks/use-shwup";
import { useStagedWrite } from "@/hooks/use-staged-write";
import { cn } from "@/lib/cn";
import { formatUsd } from "@/lib/money";

/** What the contract holds for an account: settlement payouts (forfeits, bonds) and pushes it couldn't deliver. */
export function useCredits(account: Address | undefined) {
  return useReadContract({
    ...shwupContract,
    functionName: "credits",
    args: [account ?? zeroAddress],
    query: { enabled: isConfigured && !!account, refetchInterval: 8_000 },
  });
}

/**
 * Collect what's owed to `account`. For yourself it's `withdrawCredits`; for someone else (a cause)
 * it's `withdrawCreditsFor`, which can only ever pay that account.
 */
export function CollectCredits({
  account,
  self,
  title,
  description,
  className,
}: {
  account: Address;
  self: boolean;
  title: string;
  description: string;
  className?: string;
}) {
  const { data: amount, refetch } = useCredits(account);
  const tx = useStagedWrite();
  if (!amount && !tx.result) return null;

  const collect = async () => {
    const r = self
      ? await tx.run({ ...shwupContract, functionName: "withdrawCredits", args: [] })
      : await tx.run({ ...shwupContract, functionName: "withdrawCreditsFor", args: [account] });
    if (r.ok) refetch();
  };

  return (
    <section className={cn("rounded-md border border-ok/25 bg-ok-soft p-5 text-sm", className)}>
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-ink-2">{description}</p>
      {amount ? (
        <Button variant="ok" className="mt-4" block loading={tx.busy} onClick={collect}>
          {self ? `Collect ${formatUsd(amount)}` : `Send ${formatUsd(amount)}`}
        </Button>
      ) : null}
      <TxProgress stage={tx.stage} error={tx.error} result={tx.result} doneLabel={self ? "Collected" : "Sent"} className="mt-3" />
    </section>
  );
}
