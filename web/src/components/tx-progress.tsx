"use client";

import { AlertCircle, ArrowUpRight, Check } from "lucide-react";
import { Spinner } from "@/components/ui/button";
import { explorerUrl } from "@/config/chain";
import { cn } from "@/lib/cn";
import type { FriendlyError } from "@/lib/errors";
import type { Stage, StagedResult } from "@/hooks/use-staged-write";

const STEPS: { stage: Exclude<Stage, "idle" | "done" | "error">; label: string }[] = [
  { stage: "preparing", label: "Preparing" },
  { stage: "signing", label: "Confirm in your wallet" },
  { stage: "settling", label: "Settling on Arc" },
];

const order: Stage[] = ["preparing", "signing", "settling", "done"];

/**
 * Inline, staged transaction feedback. Shows where we are, how long Arc took to finalize, and a
 * receipt link — or what went wrong and that the person's money is safe.
 */
export function TxProgress({
  stage,
  error,
  result,
  doneLabel = "Done",
  className,
}: {
  stage: Stage;
  error: FriendlyError | null;
  result: StagedResult | null;
  doneLabel?: string;
  className?: string;
}) {
  if (stage === "idle") return null;

  if (stage === "error" && error) {
    return (
      <div role="alert" className={cn("flex animate-rise gap-3 rounded-md border border-danger/25 bg-danger-soft px-4 py-3", className)}>
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
        <div className="text-sm">
          <p className="font-medium text-ink">{error.title}</p>
          <p className="mt-0.5 text-ink-2">
            {error.detail}
            {error.fundsSafe && error.kind !== "rejected" && " Your money hasn’t moved."}
          </p>
          {error.hash && explorerUrl("tx", error.hash) && (
            <a href={explorerUrl("tx", error.hash)} target="_blank" rel="noreferrer" className="mt-1 inline-block font-medium text-ink underline underline-offset-4">
              View on the explorer
            </a>
          )}
          {error.raw && (
            <details className="mt-2 text-xs text-ink-3">
              <summary className="cursor-pointer">Technical details</summary>
              <p className="mt-1 break-words font-mono">{error.raw.slice(0, 400)}</p>
            </details>
          )}
        </div>
      </div>
    );
  }

  const current = order.indexOf(stage);
  const link = result ? explorerUrl("tx", result.hash) : undefined;

  return (
    <div className={cn("animate-rise rounded-md border border-line bg-surface px-4 py-3", className)} aria-live="polite">
      <ol className="flex flex-col gap-2">
        {STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? "active" : "todo";
          return (
            <li key={s.stage} className="flex items-center gap-2.5 text-sm">
              <span className="grid size-4 place-items-center">
                {state === "done" ? (
                  <Check className="size-4 text-ok" />
                ) : state === "active" ? (
                  <Spinner className="size-3.5 text-ink" />
                ) : (
                  <span className="size-1.5 rounded-full bg-line-strong" />
                )}
              </span>
              <span className={cn(state === "todo" ? "text-ink-3" : "text-ink", state === "active" && "font-medium")}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
      {stage === "done" && result && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
          <span className="flex items-center gap-2 font-medium text-ok">
            <Check className="size-4" />
            {doneLabel}
            <span className="num font-normal text-ink-3">· final in {(result.finalityMs / 1000).toFixed(1)}s</span>
          </span>
          {link && (
            <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-ink-2 hover:text-ink">
              Receipt <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
