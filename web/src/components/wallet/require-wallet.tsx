"use client";

import { useState, type ReactNode } from "react";
import { useConnection } from "wagmi";
import { Button } from "@/components/ui/button";
import { ConnectDialog } from "@/components/wallet/connect-dialog";

/** Inline connect prompt in place of content that needs a wallet. */
export function ConnectPrompt({ title, body, cta = "Connect wallet" }: { title: string; body: ReactNode; cta?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col items-start gap-4">
      <div>
        <h2 className="font-display text-xl font-medium tracking-tight">{title}</h2>
        <p className="mt-1 max-w-md text-sm text-ink-2">{body}</p>
      </div>
      <Button onClick={() => setOpen(true)}>{cta}</Button>
      <ConnectDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

export function useWalletReady() {
  const { address, status } = useConnection();
  return { address, loading: status === "reconnecting" || status === "connecting" };
}
