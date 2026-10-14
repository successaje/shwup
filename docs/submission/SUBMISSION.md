# ShwUp — Arc Microgrants submission kit

Everything for the DoraHacks BUIDL page, ready to paste. Fill the two `⟨…⟩` placeholders once the
mainnet contract is deployed.

## Assets (this folder)

| File | Use |
| --- | --- |
| `logo-512.png` | BUIDL logo (square) |
| `cover-1920x1080.png` | BUIDL cover / banner |
| `card-1200x630.png` | Social posts (X, Farcaster) |
| `screen-landing.png` | Gallery: landing page |
| `screen-create-from-template.png` | Gallery: creating a restaurant booking from a template, with the live ticket preview |
| `screen-organizer-console.png` | Gallery: organizer console — named guests, door check-in, invite QR, host bond |

Screenshots are from a seeded local chain; retake on mainnet after the first real event if you like.

Brand: paper `#f4f1e8`, ink `#18170f`, stamp orange `#d9481f`, refund green `#157347`.
The mark is a ticket stub with a perforation.

---

## BUIDL name

ShwUp

## Tagline

Commit. Show up. Get it back. Refundable USDC deposits for events, tables and appointments, on Arc.

## Links

- **Live app (Arc mainnet):** https://shwup.vercel.app
- **Contract (Arc mainnet, verified):** https://explorer.arc.io/address/⟨MAINNET_ADDRESS⟩?tab=contract
- **Repo:** https://github.com/successaje/shwup
- **Builder:** https://github.com/successaje
- Testnet contract (verified): https://explorer.testnet.arc.io/address/0xf0802c0C94beC42ac93bc7439724dF04674a7A39?tab=contract

## Tags

Arc · USDC · Payments · Consumer · Events

---

## Short description (what it does and what it uses Arc for)

> ShwUp turns a free RSVP into a refundable commitment. Guests hold a spot at an event, a
> restaurant table or an appointment with a small USDC deposit, and get it back the moment they're
> scanned in at the door. People who never show forfeit theirs — to the people who came, to the
> organizer, or to a cause the organizer picked.
>
> Arc is what makes this work at $2–$20. USDC is the gas token, so holding a spot is a single
> `payable` call with no token approval and no second coin. Refunds cost about a tenth of a cent and
> are final in under a second — before the guest is through the door. The door scanner is a
> throwaway key that's authorized and funded with gas in USDC in the same transaction.

---

## Full description

### The problem

A free RSVP is free to ignore. Meetups, workshops, dinners and appointments routinely lose a big
share of the people who said they'd come: organizers over-order, book rooms that are too big, and
turn away people who would have shown up. Charging for tickets fixes attendance but makes the event
not free. A deposit you get back fixes it without costing anyone who comes a cent — but card holds
have fixed fees and take days to release, so small deposits never made sense.

### How it works

1. **Hold a spot.** The organizer sets a deposit ($2, $5, $10…). Guests pay it from their wallet
   into a public contract — not to the organizer.
2. **Show up.** Door mode turns any phone into a scanner. Each scan checks the guest in and pushes
   their deposit straight back. The guest's ticket page flips to "You're in. +$5.00" on its own.
3. **Or don't.** After check-in closes, no-show deposits go where the organizer chose up front:
   split among the people who came, kept to cover the empty seat, or sent to a charity or community
   fund.

### What makes it more than a deposit

- **Pass your spot on.** Can't make it after the cancellation cutoff? Offer your spot; whoever takes
  it — even when the event is full — pays your deposit straight back to you. The price is fixed at
  the deposit, so spots can't be scalped.
- **Host bond.** Organizers can put money behind their own promise. If they cancel — or never open
  the door — the bond is split among everyone holding a spot.
- **Nobody checked in, nobody loses.** If check-in closes with no one scanned in (a dead phone, an
  organizer who didn't turn up), every guest gets their deposit back.
- **Track records.** Every invite shows the organizer's on-chain history: events run and what share
  of RSVPs were actually checked in. Guests have a show-up record of their own.
- **One contract, any door.** The same contract call covers a community event, a restaurant table
  and an appointment — only the terms change. Each is a template in the app.

### Why Arc

| Arc capability | Where ShwUp uses it |
| --- | --- |
| USDC is the native gas token | The deposit *is* `msg.value`: holding a spot is one transaction, no ERC-20 approval |
| Gas is dollars | Door mode authorizes a scanner key *and* funds its gas with $0.25 USDC in one `setChecker` call |
| ~$0.001 fees | A $2 deposit is worth taking and returning; refunds cost a tenth of a cent |
| Sub-second deterministic finality | The refund is final before the guest is through the door; the app shows the measured time |
| Circle CCTP (App Kit) | Guests without USDC on Arc bring it from Base, Ethereum, Arbitrum, Optimism or Polygon inside the app; Circle's forwarder mints on Arc, so they need no Arc gas first |

Measured on Arc testnet: hold a spot ≈ $0.004, door refund ≈ $0.0025, claim ≈ $0.0013.

### What's built

- **Contract** (Solidity, Foundry): 74 unit, fuzz and invariant tests, including a solvency
  invariant (the contract holds exactly what it owes) fuzzed across random lifecycles. An independent
  adversarial review found no critical or high issues; its medium findings were fixed and re-reviewed
  before mainnet. Settlement credits rather than pushes, so one recipient can't freeze an event.
- **App** (Next.js, wagmi/viem): create events from templates, invite links and QR, door mode with a
  camera scanner, named guest lists, CSV export, hand-overs, activity and money history, organizer
  track records, add-to-calendar, Apple/Google Wallet passes (behind credentials), installable PWA.
  62 unit tests.
- **CI** simulates every money path (12 of them) against the deployed contract on a live Arc node,
  on every pull request.
- Built in public as 27 reviewed pull requests.

### Try it in two minutes

1. Open the app and create an event from the **Community event** template.
2. Open the invite link on your phone and tap **Hold my spot**.
3. Back on the organizer's screen, open **door mode** and scan the phone. The deposit returns in
   under a second; the ticket flips to "You're in."

### What's next

An API and hosted checkout links so any booking or ticketing tool can add a refundable commitment;
wallet passes that update at the door; co-hosts; email and Telegram reminders.
