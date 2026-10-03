# ShwUp contracts

A single contract, [`ShwUp.sol`](src/ShwUp.sol), holds RSVP deposits and releases them. Built
with Foundry for Arc, where **USDC is the native currency** — deposits are `msg.value` with 18
decimals, so holding a spot is one transaction with no token approval.

## State machine

Event:

```
created ──► (startsAt − 1h) check-in opens ──► checkInEndsAt ──► settle()
   └──► cancelEvent()  — organizer only, before startsAt, before any check-in
```

Ticket (per attendee, per event):

| From | Action | To | Money |
| --- | --- | --- | --- |
| None / Released | `rsvp` (payable, exact deposit) | Held | deposit in |
| Held | `cancelRsvp` (before `cancelCutoff`) | Released | deposit → attendee |
| Held | `checkIn` (organizer or checker) | CheckedIn | deposit → attendee |
| Held | `claim` after `cancelEvent` | Released | deposit → attendee |
| CheckedIn | `claim` after check-in closes, Attendees policy (settles first if nobody has) | CheckedIn (+bonusClaimed) | share of forfeits → attendee |
| Held | `settle` | Held (no-show) | deposit forfeited |

Forfeits at `settle`:

- `ForfeitPolicy.Attendees` — split evenly among checked-in attendees (pull via `claim`);
  integer-division dust goes to the organizer. If nobody checked in, everything goes to the organizer.
- `ForfeitPolicy.Organizer` — paid to the organizer.

## Profile and details

- `setName(name)` / `rsvpAs(eventId, name)` — an optional **public** display name per wallet (≤ 32
  bytes), shown to organizers on guest lists and at the door. `namesOf(address[])` reads a batch.
- `updateDetails(eventId, metadata)` — the organizer can edit name/location/description until
  check-in closes. Money terms (deposit, schedule, capacity, forfeit policy) are fixed once created,
  because guests committed to them.

## Invariants

- **Solvency** — the contract balance equals exactly what it owes (held deposits of unsettled
  events, refunds in cancelled events, unclaimed bonuses, credits). Fuzzed in
  [`ShwUp.invariant.t.sol`](test/ShwUp.invariant.t.sol).
- A deposit leaves only to the attendee who paid it, to checked-in attendees as a bonus, or to the
  organizer as forfeits. The organizer can never withdraw held deposits.
- Each ticket is refunded at most once; a bonus is claimed at most once.
- Deposits can't be locked forever: the check-in window is capped at 2 days and anyone can settle.

## Trust & safety notes

- **Door checkers.** `setChecker` lets the organizer authorize a throwaway key (the web app's door
  scanner) and fund its gas in the same call. A checker can only mark Held attendees as arrived,
  which refunds *them* — a leaked door key can't move money anywhere else.
- **Push with fallback.** Refunds and organizer payouts are pushed with a 50k gas stipend. If the
  receiver rejects them they're credited to `credits[addr]` and withdrawable via `withdrawCredits`,
  so one hostile receiver can't block check-in or settlement.
- All state-changing functions that move funds are `nonReentrant` and follow checks-effects-interactions.
- **Known incentive limits** (not bugs, but worth stating):
  - *Organizer policy*: the organizer keeps no-show deposits, so they have an incentive not to scan
    real guests. The guest page shows each organizer's on-chain track record so guests can judge.
  - *Attendees policy*: an organizer (or anyone) can RSVP extra wallets and check them in, diluting
    the per-attendee bonus. Their deposits are refunded, so it costs only gas. The bonus is a perk,
    not a guarantee.

## Commands

```bash
forge build
forge test                 # unit, fuzz and invariant tests
forge fmt --check

# Deploy (Arc testnet). Import a key once with: cast wallet import shwup-deployer --interactive
export ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.io
forge script script/Deploy.s.sol --rpc-url arc_testnet --account shwup-deployer --broadcast
```

Deployed addresses are written to [`deployments/<chainId>.json`](deployments/).
