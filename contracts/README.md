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
| None / Released / Transferred | `rsvp` (payable, exact deposit) | Held | deposit in |
| Held | `offerSpot(to)` (until check-in closes; `to` = 0 for anyone) | Held, offered | — |
| Held, offered | `withdrawOffer` | Held | — |
| Held, offered | `takeSpot(from)` by the taker (payable, exact deposit) | holder → Transferred, taker → Held | taker's deposit → holder |
| Held | `cancelRsvp` (before `cancelCutoff`) | Released | deposit → attendee |
| Held | `checkIn` (organizer or checker) | CheckedIn | deposit → attendee |
| Held | `claim` after `cancelEvent` | Released | deposit + bond share → attendee |
| Held | `claim` after check-in closed with **nobody** checked in | Released | deposit + bond share → attendee |
| CheckedIn | `claim` after check-in closes, Attendees policy (settles first if nobody has) | CheckedIn (+bonusClaimed) | share of forfeits → attendee |
| Held | `settle`, someone was checked in | Held (no-show) | deposit forfeited |

Forfeits at `settle` (only when at least one person was checked in):

- `ForfeitPolicy.Attendees` — split evenly among checked-in attendees (pull via `claim`);
  integer-division dust goes to the organizer.
- `ForfeitPolicy.Organizer` — to the organizer.
- `ForfeitPolicy.Beneficiary` — to the `beneficiary` address fixed at creation (a charity,
  community fund, next event's budget). Must be zero for the other policies.

**Nobody checked in.** If check-in closes with zero check-ins, nothing is forfeited under any
policy: every guest still holding a spot claims their deposit back, plus an equal share of the
organizer's bond, exactly as if the organizer had cancelled. A door that never opened shouldn't cost
guests anything, and an organizer who never shows up shouldn't come out ahead of one who cancels.

**Settlement pays by credit.** `settle` makes no external calls: the organizer's and beneficiary's
amounts (forfeits, dust, bond) are added to `credits` and collected with `withdrawCredits`, or
delivered by anyone with `withdrawCreditsFor(account)` — the funds can only go to their owner. So a
recipient that rejects or is blocked from receiving USDC can't freeze an event's settlement, its
bonuses or its refunds.

## Hand-overs

A guest who can't come can `offerSpot` — to anyone, or to one named address. Whoever takes it pays
exactly the deposit, which goes straight to the person leaving; the event's `held` count doesn't
change, so it works when the event is full and after the cancellation cutoff. Because the price is
fixed at the deposit, spots can't be resold for profit. `getOffers(id, offset, limit)` lists open
offers for a page of attendees. Offers are cleared automatically by check-in, cancellation or claim.

## Organizer bond

`createEvent` is payable: any value sent is the organizer's bond (`BondPosted`). If the event goes
ahead (someone is checked in), settlement credits it back to the organizer (`BondReturned`). If the
organizer cancels — or check-in closes with nobody checked in — it's split equally among the guests
holding spots at that moment (`bondPerGuest`, collected by `claim` with their deposit);
integer-division dust, or the whole bond when nobody holds a spot, goes back to the organizer.

## Profile and details

- `setName(name)` / `rsvpAs(eventId, name)` — an optional **public** display name per wallet (≤ 32
  bytes), shown to organizers on guest lists and at the door. `namesOf(address[])` reads a batch.
- `updateDetails(eventId, metadata)` — the organizer can edit name/location/description until
  check-in closes. Money terms (deposit, schedule, capacity, forfeit policy) are fixed once created,
  because guests committed to them.

## Invariants

- **Solvency** — the contract balance equals exactly what it owes (held deposits of unsettled
  events, refunds plus bond shares in cancelled events, bonds of live events, unclaimed bonuses,
  credits), including across hand-overs. Fuzzed in
  [`ShwUp.invariant.t.sol`](test/ShwUp.invariant.t.sol).
- A deposit leaves only to the attendee who paid it (refund, or from the person taking their spot),
  to checked-in attendees as a bonus, or as forfeits to the organizer or the event's beneficiary.
  The organizer can never withdraw held deposits.
- Each ticket is refunded at most once; a bonus is claimed at most once.
- Deposits can't be locked forever: the check-in window is capped at 2 days and anyone can settle.

## Trust & safety notes

- **Door checkers.** `setChecker` lets the organizer authorize a throwaway key (the web app's door
  scanner) and fund its gas in the same call. A checker can only mark Held attendees as arrived,
  which refunds *them*, and can't check itself in. The organizer can't hold a spot at their own
  event. A leaked door key can still check in guests who never came (refunding them) — that changes
  who counts as a no-show, which is why door keys are per-event and revocable.
- **Push with fallback; settlement by credit.** Refunds to guests are pushed with a 50k gas stipend;
  if the receiver rejects them they're credited to `credits[addr]` instead. Settlement only credits.
  Beneficiaries should be wallets (or contracts) able to receive USDC, or have someone call
  `withdrawCreditsFor` for them.
- All state-changing functions that move funds are `nonReentrant` and follow checks-effects-interactions.
- **Known incentive limits** (not bugs, but worth stating):
  - *Organizer policy*: the organizer keeps no-show deposits, so they have an incentive not to scan
    real guests. The guest page shows each organizer's on-chain track record so guests can judge.
  - *Attendees policy*: an organizer can RSVP extra wallets they control and check only those in,
    so their "attendees" collect the no-shows' bonus — and checking in a single wallet switches off
    the nobody-checked-in refund. The contract can't tell a real guest from a sybil; the public track
    record (show-up rate across past events) is the guest's protection. The bonus is a perk, not a
    guarantee.
  - *Editable details*: the organizer can edit the name, venue and description until check-in
    closes (typos happen). A bait-and-switch on the venue is possible; the app shows the current
    details on every ticket and guests can pass their spot on.

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
