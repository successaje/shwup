import type { ShwUpEvent } from "@/domain/event";

/** Public, contract-derived totals: what ShwUp has actually done on Arc. */
export type ProtocolStats = {
  events: number; // created and not cancelled
  checkIns: number; // guests scanned in at a door
  returnedAtDoor: bigint; // deposits refunded on check-in
  heldNow: bigint; // deposits currently held for upcoming or open events
};

export function protocolStats(events: ShwUpEvent[]): ProtocolStats {
  let checkIns = 0;
  let returnedAtDoor = 0n;
  let heldNow = 0n;
  let live = 0;
  for (const e of events) {
    if (e.cancelled) continue;
    live++;
    checkIns += e.checkedIn;
    returnedAtDoor += BigInt(e.checkedIn) * e.deposit;
    // Until settlement, everyone not yet checked in still has their deposit in the contract.
    if (!e.settled) heldNow += BigInt(e.held - e.checkedIn) * e.deposit;
  }
  return { events: live, checkIns, returnedAtDoor, heldNow };
}
