import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { chain, rpcUrl } from "@/config/chain";

/**
 * Injected (EIP-6963) wallets only: MetaMask, Rabby, Phantom, Coinbase extension, and mobile
 * in-app browsers. ShwUp holds no keys and needs no wallet vendor API keys.
 */
export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: { [chain.id]: http(rpcUrl) },
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
