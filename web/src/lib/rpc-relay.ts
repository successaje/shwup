/**
 * Which JSON-RPC calls the app's same-origin relay forwards to Arc. Reads only: the relay never
 * signs or sends anything — transactions go through the person's own wallet.
 */
export const RELAY_METHODS = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getLogs",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_maxPriorityFeePerGas",
  "net_version",
]);

export const RELAY_MAX_BODY = 200_000; // bytes; app batches stay well under this
export const RELAY_MAX_BATCH = 100;

type RpcRequest = { jsonrpc?: unknown; id?: unknown; method?: unknown };

/** Null if every request in the (possibly batched) body may be relayed; otherwise why not. */
export function relayRejection(body: unknown): string | null {
  const requests = Array.isArray(body) ? body : [body];
  if (requests.length === 0 || requests.length > RELAY_MAX_BATCH) return "batch size";
  for (const r of requests as RpcRequest[]) {
    if (!r || typeof r !== "object" || typeof r.method !== "string") return "malformed request";
    if (!RELAY_METHODS.has(r.method)) return `method not allowed: ${r.method}`;
  }
  return null;
}
