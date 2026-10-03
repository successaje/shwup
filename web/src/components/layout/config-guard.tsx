import type { ReactNode } from "react";
import { chain, shwupAddress } from "@/config/chain";

/** Fails loudly (for operators, not users) when a deployment is missing its contract address. */
export function ConfigGuard({ children }: { children: ReactNode }) {
  if (shwupAddress) return children;
  return (
    <div className="max-w-lg rounded-md border border-warn/30 bg-warn-soft p-5 text-sm">
      <p className="font-medium">ShwUp isn&apos;t connected to a contract yet</p>
      <p className="mt-1 text-ink-2">
        Set <code className="num">NEXT_PUBLIC_SHWUP_ADDRESS</code> to the ShwUp deployment on {chain.name} and rebuild.
        See the README for deployment steps.
      </p>
    </div>
  );
}
