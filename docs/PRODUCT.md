# ShwUp — product model

## Thesis

An RSVP costs nothing, so it means nothing. ShwUp makes a spot cost a small
refundable deposit: put down $5 to hold it, get the $5 back the second you walk
in. People who don't come forfeit their deposit — to the people who did, or to
the organizer, depending on the event.

## Why this didn't exist before

Kickback tried this on Ethereum in 2018. It faded because the deposit was in a
volatile asset and gas could cost more than the deposit itself. Card rails don't
work either: fixed fees make a $5 hold-and-refund uneconomical.

Arc removes both problems:

| Arc property | What it means for ShwUp |
| --- | --- |
| USDC is the native gas token | The deposit is `msg.value`. Holding a spot is one transaction — no approve, no second token. |
| ~$0.001 fees | A $2 deposit is viable. Refunding it costs a tenth of a cent. |
| Sub-second deterministic finality | The refund at the door is final before the attendee reaches the coat check. |
| Gas is dollars | A door scanner key can be funded with $0.25 and handle ~150 check-ins without prompts. |

## Users

- **Organizer** (primary): runs free or cheap meetups, workshops, community
  dinners. Their pain is 40–60% no-show rates on free RSVPs.
- **Attendee**: wants a spot and doesn't mind a deposit they will get back.

Later: appointment businesses (barbers, clinics, tutors) — same primitive, forfeit
goes to the organizer.

## Core actions

- Organizer: **create an event with a deposit** and share the link.
- Attendee: **hold a spot**.
- Door: **scan a ticket** → deposit returned.

## Magic moment

The attendee's ticket screen is open while they're scanned at the door. Within a
second it flips to **"You're in. $5.00 is back in your wallet."** No one pressed
refund. No one waited.

## Product loop

attendee holds a spot → shows up → gets money back (sometimes more than they put
in) → runs their own event on ShwUp → new attendees.

## Event lifecycle

```
created ──► open for RSVPs ──► doors open (startsAt) ──► doors close (checkInEndsAt) ──► settled
   │                                                                                         │
   └──► cancelled by organizer (before startsAt) → every deposit claimable                  └──► forfeits paid out
```

- **cancelCutoff** — attendees can cancel for a full refund until this time.
- **startsAt** — check-in opens. Organizer can no longer cancel the event.
- **checkInEndsAt** — check-in closes; anyone can settle.
- **Forfeit policy** — chosen per event:
  - `Attendees`: no-show deposits are split evenly among checked-in attendees.
  - `Organizer`: no-show deposits go to the organizer.

## Attendee states

`none → held → checked in → (bonus claimed)`
`held → cancelled` (before cutoff, refunded)
`held → no-show` (after settle, forfeited)

## Flows

| Flow | Route |
| --- | --- |
| First visit / explanation | `/` |
| Organizer & attendee home (returning user) | `/app` |
| Create event | `/app/new` |
| Organizer event console (stats, attendees, share, settle) | `/app/events/[id]` |
| Door mode (scanner) | `/app/events/[id]/door` |
| Public event page — RSVP, ticket, live check-in, claim | `/e/[id]` |

## Non-goals (v1)

Paid ticketing, NFTs, reputation scores, a token, discovery/marketplace,
off-chain accounts.
