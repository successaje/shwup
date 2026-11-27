import "server-only";
import { createPublicClient, http } from "viem";
import { chain, rpcUrl } from "@/config/chain";

/** The server's read-only connection to the chain. */
export const chainClient = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 4_000 }) });
