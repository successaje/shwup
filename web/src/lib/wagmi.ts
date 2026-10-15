import { fallback } from "viem";
import { cookieStorage, createConfig, createStorage, http, type CreateConnectorFn } from "wagmi";
import { injected, mock } from "wagmi/connectors";
import { chain, chainKey, rpcUrl } from "@/config/chain";

/**
 * Injected (EIP-6963) wallets only: MetaMask, Rabby, Phantom, Coinbase extension, and mobile
 * in-app browsers. ShwUp holds no keys and needs no wallet vendor API keys.
 */
const connectors: CreateConnectorFn[] = [injected()];

/**
 * LOCAL DEVELOPMENT ONLY: anvil's pre-funded, unlocked test accounts, so flows can be exercised
 * without a browser extension. Never included unless the build targets the local chain.
 */
if (chainKey === "local") {
  const testAccounts = [
    ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "Test account 1 · organizer"],
    ["0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "Test account 2 · guest"],
    ["0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", "Test account 3 · guest"],
    ["0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", "Test account 4 · new"],
  ] as const;
  for (const [address, name] of testAccounts) {
    const base = mock({ accounts: [address], features: { reconnect: true, defaultConnected: true } });
    connectors.push((config) => ({ ...base(config), id: `anvil-${address}`, name }));
  }
}

/**
 * In the browser, reads go through our same-origin relay first (/api/rpc): some extensions,
 * networks and providers block direct requests to the chain's RPC host. Falls back to the RPC
 * directly. The local chain has no relay need.
 */
function transport() {
  if (typeof window === "undefined" || chainKey === "local") return http(rpcUrl);
  return fallback([http(new URL("/api/rpc", window.location.origin).href, { batch: true }), http(rpcUrl)]);
}

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors,
  transports: { [chain.id]: transport() },
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
