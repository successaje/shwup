"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { createWalletClient, type Address } from "viem";
import { transport } from "@/lib/wagmi";
import type { PrivateKeyAccount } from "viem/accounts";
import { useBalance, usePublicClient, useReadContract } from "wagmi";
import { chain, shwupAddress } from "@/config/chain";
import { createDoorKey, DOOR_KEY_FUNDING, forgetDoorKey, loadDoorKey } from "@/lib/door-key";
import { shwupContract } from "@/hooks/use-shwup";
import { useStagedWrite } from "@/hooks/use-staged-write";

const noop = () => () => {};

/** Door key lifecycle for one event: create + authorize (+ fund), check gas, return leftovers. */
export function useDoorKey(eventId: bigint) {
  const [version, setVersion] = useState(0);
  const key = useSyncExternalStore(
    noop,
    () => (shwupAddress ? cachedKey(chain.id, shwupAddress, eventId, version) : null),
    () => null,
  );
  const publicClient = usePublicClient({ chainId: chain.id });
  const authorizeTx = useStagedWrite();

  const { data: authorized, refetch: refetchAuthorized } = useReadContract({
    ...shwupContract,
    functionName: "isChecker",
    args: [eventId, key?.address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!key },
  });
  const { data: balance, refetch: refetchBalance } = useBalance({
    address: key?.address,
    chainId: chain.id,
    query: { enabled: !!key, refetchInterval: 15_000 },
  });

  /** One organizer transaction: authorize a fresh key for this event and send it gas money. */
  const authorize = useCallback(async () => {
    if (!shwupAddress) return;
    const k = createDoorKey(chain.id, shwupAddress, eventId);
    setVersion((v) => v + 1);
    const r = await authorizeTx.run({
      ...shwupContract,
      functionName: "setChecker",
      args: [eventId, k.address, true],
      value: DOOR_KEY_FUNDING,
    });
    if (r.ok) await Promise.all([refetchAuthorized(), refetchBalance()]);
  }, [authorizeTx, eventId, refetchAuthorized, refetchBalance]);

  /** Send whatever gas the key has left back to the organizer, then forget the key. */
  const returnLeftovers = useCallback(
    async (to: Address) => {
      if (!key || !publicClient || !shwupAddress) return false;
      const wallet = createWalletClient({ account: key, chain, transport: transport() });
      const [bal, fees] = await Promise.all([publicClient.getBalance({ address: key.address }), publicClient.estimateFeesPerGas()]);
      const gas = 21_000n * 2n; // headroom for Arc's system transfer log
      const cost = gas * fees.maxFeePerGas;
      if (bal > cost) {
        const hash = await wallet.sendTransaction({ to, value: bal - cost, gas, maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas });
        await publicClient.waitForTransactionReceipt({ hash });
      }
      forgetDoorKey(chain.id, shwupAddress, eventId);
      setVersion((v) => v + 1);
      return true;
    },
    [eventId, key, publicClient],
  );

  return {
    key: authorized ? key : null,
    pendingKey: key,
    authorized: Boolean(authorized),
    balance: balance?.value,
    authorize,
    authorizeTx,
    returnLeftovers,
  };
}

// useSyncExternalStore needs a stable snapshot: cache the parsed key per (event, version).
let cache: { id: string; key: PrivateKeyAccount | null } | null = null;
function cachedKey(chainId: number, contract: Address, eventId: bigint, version: number) {
  const id = `${chainId}:${contract}:${eventId}:${version}`;
  if (cache?.id !== id) cache = { id, key: loadDoorKey(chainId, contract, eventId) };
  return cache.key;
}
