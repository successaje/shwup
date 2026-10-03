"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { WagmiProvider, type State } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children, initialState }: { children: ReactNode; initialState?: State }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 4_000, refetchOnWindowFocus: true, retry: 2 } },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="bottom-center"
          gap={8}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "flex w-[min(92vw,380px)] items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink shadow-[0_8px_24px_-12px_rgb(0_0_0/0.25)]",
              title: "font-medium",
              description: "text-ink-2 mt-0.5",
              icon: "mt-0.5",
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
