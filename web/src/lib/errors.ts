import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";
import { chain } from "@/config/chain";

export type FriendlyError = {
  title: string;
  detail: string;
  /** Whether the person's money is untouched, so we can say so. */
  fundsSafe: boolean;
  kind: "rejected" | "revert" | "funds" | "network" | "unknown" | "unconfirmed";
  /** The underlying error, for the "Technical details" toggle. */
  raw?: string;
  /** Set when a transaction was already sent: link it rather than claim nothing moved. */
  hash?: string;
};

/** A transaction that was sent but whose confirmation we couldn't observe. */
export function unconfirmed(hash: string, error: unknown): FriendlyError {
  return {
    kind: "unconfirmed",
    title: "Sent — still confirming",
    detail: "Your wallet sent the transaction, but we couldn't see it confirm yet. Check it on the explorer before trying again.",
    fundsSafe: false,
    hash,
    raw: rawMessage(error),
  };
}

function rawMessage(error: unknown): string | undefined {
  if (error instanceof BaseError) return [error.shortMessage, error.details].filter(Boolean).join(" — ");
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : undefined;
}

/** What each contract error means to a person, not a developer. */
const REVERTS: Record<string, { title: string; detail: string }> = {
  WrongDepositAmount: { title: "Deposit amount changed", detail: "Refresh the page and try again." },
  EventFull: { title: "This event is full", detail: "Every spot is taken. If someone cancels, a spot opens up." },
  AlreadyHolding: { title: "You already have a spot", detail: "Your ticket is below." },
  RsvpClosed: { title: "RSVPs are closed", detail: "Check-in for this event has ended." },
  EventIsCancelled: { title: "This event was cancelled", detail: "Held deposits can be claimed back in full." },
  EventIsSettled: { title: "Already settled", detail: "No-show deposits for this event were already paid out." },
  CancellationClosed: { title: "Too late to cancel", detail: "The cancellation cutoff has passed — show up to get your deposit back." },
  NoSpotHeld: { title: "No spot held", detail: "This wallet doesn't have an active spot for this event." },
  NotAuthorizedChecker: { title: "Not allowed to check people in", detail: "Only the organizer or an authorized door device can do this." },
  CheckInNotOpen: { title: "Doors aren't open yet", detail: "Check-in opens one hour before the event starts." },
  CheckInClosed: { title: "Check-in has closed", detail: "The check-in window for this event has ended." },
  EventAlreadyStarted: { title: "The event has started", detail: "Events can only be cancelled before they begin." },
  AttendeesAlreadyCheckedIn: { title: "People are already checked in", detail: "An event can't be cancelled once anyone has arrived." },
  SettlementNotOpen: { title: "Not yet", detail: "No-shows can be settled once check-in closes." },
  NothingToClaim: { title: "Nothing to claim", detail: "There's nothing owed to this wallet for this event." },
  NotOrganizer: { title: "Organizer only", detail: "Switch to the wallet that created this event." },
  InvalidSchedule: { title: "Check the times", detail: "The event must start in the future and check-in must close after it starts (within 2 days)." },
  InvalidDeposit: { title: "Deposit required", detail: "Set a deposit greater than $0." },
  MetadataTooLarge: { title: "Description too long", detail: "Shorten the event details and try again." },
  EventNotFound: { title: "Event not found", detail: "This link may be wrong, or the event is on another network." },
};

export function toFriendlyError(error: unknown): FriendlyError {
  const f = classify(error);
  return f.kind === "rejected" ? f : { ...f, raw: rawMessage(error) };
}

function classify(error: unknown): FriendlyError {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return { kind: "rejected", title: "Request cancelled", detail: "You declined in your wallet. Nothing was sent.", fundsSafe: true };
    }

    const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      const known = name ? REVERTS[name] : undefined;
      if (known) return { kind: "revert", ...known, fundsSafe: true };
      return { kind: "revert", title: "Transaction would fail", detail: "Nothing was sent. Refresh and try again.", fundsSafe: true };
    }

    const text = `${error.shortMessage} ${error.details ?? ""}`.toLowerCase();
    if (text.includes("does not support programmatic chain switching")) return SWITCH_MANUALLY;
    if (text.includes("insufficient funds") || text.includes("exceeds the balance")) {
      return { kind: "funds", title: "Not enough USDC", detail: "Your wallet needs a bit more USDC to cover this and the tiny network fee.", fundsSafe: true };
    }
    if (text.includes("chain") && text.includes("mismatch")) {
      return { kind: "network", title: "Wrong network", detail: "Switch your wallet to Arc and try again.", fundsSafe: true };
    }
    if (text.includes("http request failed") || text.includes("fetch") || text.includes("timeout") || text.includes("took too long")) {
      return {
        kind: "network",
        title: "Can't reach the network",
        detail: `Arc didn't respond. Check your connection — and in your wallet's network settings, that ${chain.name}'s RPC is ${chain.rpcUrls.default.http[0]} (chain ${chain.id}).`,
        fundsSafe: true,
      };
    }
  }
  if (error instanceof Error && error.message === "ChainSwitchUnavailable") return SWITCH_MANUALLY;
  return { kind: "unknown", title: "Something went wrong", detail: "Nothing was sent. Try again in a moment.", fundsSafe: true };
}

const SWITCH_MANUALLY: FriendlyError = {
  kind: "network",
  title: "Switch your wallet to Arc",
  detail:
    `Your wallet didn't let us switch networks. Open its network menu and choose ${chain.name} — or add it: RPC ${chain.rpcUrls.default.http[0]}, chain ID ${chain.id}, currency USDC — then try again.`,
  fundsSafe: true,
};

/** True when a read failed because the event doesn't exist (vs. the network being down). */
export function isNotFound(error: unknown): boolean {
  if (!(error instanceof BaseError)) return false;
  const revert = error.walk((e) => e instanceof ContractFunctionRevertedError);
  return revert instanceof ContractFunctionRevertedError && revert.data?.errorName === "EventNotFound";
}
