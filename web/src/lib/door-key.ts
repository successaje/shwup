import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import type { Address, Hex } from "viem";

/**
 * A door key is a throwaway account that lives only in this browser. The organizer authorizes it
 * as a checker for one event (and funds its gas with a few cents of USDC), so scanning tickets
 * needs no wallet prompts.
 *
 * Blast radius if it leaks: it can only mark held tickets for that one event as arrived, which
 * refunds those guests. It can't move deposits anywhere else.
 */
const storageKey = (chainId: number, contract: Address, eventId: bigint) =>
  `shwup:door:${chainId}:${contract.toLowerCase()}:${eventId}`;

function read(key: string): Hex | null {
  try {
    const v = localStorage.getItem(key);
    return v && /^0x[0-9a-f]{64}$/i.test(v) ? (v as Hex) : null;
  } catch {
    return null;
  }
}

export function loadDoorKey(chainId: number, contract: Address, eventId: bigint): PrivateKeyAccount | null {
  const pk = read(storageKey(chainId, contract, eventId));
  return pk ? privateKeyToAccount(pk) : null;
}

export function createDoorKey(chainId: number, contract: Address, eventId: bigint): PrivateKeyAccount {
  const existing = loadDoorKey(chainId, contract, eventId);
  if (existing) return existing;
  const pk = generatePrivateKey();
  try {
    localStorage.setItem(storageKey(chainId, contract, eventId), pk);
  } catch {
    // Private mode / storage blocked: the key still works for this session.
  }
  return privateKeyToAccount(pk);
}

export function forgetDoorKey(chainId: number, contract: Address, eventId: bigint) {
  try {
    localStorage.removeItem(storageKey(chainId, contract, eventId));
  } catch {
    // ignore
  }
}

/** Gas sent to a new door key: ~$0.25 covers well over a hundred check-ins at Arc's ~$0.002 each. */
export const DOOR_KEY_FUNDING = 25n * 10n ** 16n;
