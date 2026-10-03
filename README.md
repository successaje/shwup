# ShwUp

**Refundable RSVPs on Arc.** Guests hold a spot with a small USDC deposit and get it back the second
they're scanned in at the door. People who never show forfeit theirs — split among the people who
came, or paid to the organizer.

**Live (Arc testnet):** https://shwup.vercel.app · **Contract:** [verified on the Arc explorer](https://explorer.testnet.arc.io/address/0x191e7817E6fAafF2169660e6F13f2f3197ecBC9C?tab=contract)

---

## The problem

A free RSVP is free to ignore. Free meetups, workshops and community dinners routinely see a large
share of RSVPs never arrive, so organizers over-order food, book rooms that are too big, and turn
away people on the waitlist who would have come.

Charging for tickets fixes attendance but makes the event not free. A *refundable deposit* fixes it
without costing anyone who shows up — but until now the rails made small deposits impractical:

- **Card holds** have fixed fees; holding and refunding $5 costs real money and takes days.
- **Earlier on-chain attempts** (e.g. Kickback, 2018) took deposits in a volatile token, and gas to
  refund $5 could exceed $5.

## The solution

| | |
| --- | --- |
| **Organizer** | Creates an event with a deposit ($2 / $5 / $10 / custom) and chooses where no-show deposits go. Shares a link. |
| **Guest** | Opens the link, taps **Hold my spot · $5.00**. Gets a ticket with a QR code. |
| **Door** | Organizer's phone runs **door mode**. Each scan checks the guest in and refunds their deposit — final in under a second, no wallet pop-ups. |
| **After** | Anyone can settle once check-in closes. No-show deposits are split among attendees (who collect them from their ticket) or paid to the organizer. |

The moment that matters: the guest's ticket page is open while they're scanned, and it flips by
itself to **"You're in. +$5.00 is back in your wallet."**

## Why Arc

ShwUp only works because of specific Arc properties — each is load-bearing:

| Arc capability | Where ShwUp uses it |
| --- | --- |
| **USDC is the native gas token** (18 decimals) | The deposit *is* `msg.value` — `rsvp()` is `payable`, so holding a spot is **one transaction with no ERC-20 approve**. ([`ShwUp.sol`](contracts/src/ShwUp.sol)) |
| **Gas is dollars** | Door mode authorizes a throwaway scanner key *and funds its gas with $0.25 USDC* in a single `setChecker{value}` call — no second token, no faucet. ([`use-door-key.ts`](web/src/hooks/use-door-key.ts)) |
| **~$0.001 fees, smoothed base fee** | Deposits as small as $2 are economical to take and return; a refund costs a tenth of a cent. |
| **Sub-second deterministic finality** | Refunds are final before the guest is through the door; the guest's ticket polls once a second and flips immediately. The app measures and shows the finality time of every action. ([`use-staged-write.ts`](web/src/hooks/use-staged-write.ts)) |
| **System Transfer logs for native USDC** | Explorer receipts for refunds read like normal token transfers. |

## How it works

```
Organizer                         ShwUp contract (Arc)                      Guest
    │ createEvent(deposit, schedule,            │                              │
    │   forfeitPolicy, metadata) ─────────────► │                              │
    │                                           │ ◄──────── rsvp() {value: $5} │  spot held
    │ setChecker(event, doorKey,                │                              │
    │   true) {value: $0.25} ─────────────────► │ ──► $0.25 gas to door key    │
    │                                           │                              │
 door key: checkIn(event, guest) ─────────────► │ ──► $5 back to guest ──────► │  "You're in."
    │                                           │                              │
 anyone (after doors close): settle(event) ───► │ no-show $ → attendees' claim │
    │                                           │   or → organizer             │
    │                                           │ ◄──────────── claim(event)   │  +$1.25
```

### Contract

One contract, [`contracts/src/ShwUp.sol`](contracts/src/ShwUp.sol). State machine, invariants and
trust notes are in [`contracts/README.md`](contracts/README.md). Highlights:

- Deposits only ever leave to: the guest who paid (cancel / check-in / event cancelled), checked-in
  guests (bonus share), or the organizer (forfeits under the organizer policy, rounding dust).
  **The organizer can never withdraw held deposits.**
- Permissionless settlement; check-in window capped at 2 days so funds can't be locked forever.
- Push payments with a gas stipend and a credit fallback, so one hostile receiver can't block the door.
- 50 unit/fuzz tests plus a **solvency invariant** (`balance == liabilities`) over randomized lifecycles.
- **Verified on a live Arc node in CI** (`pnpm --filter web smoke:arc`): every money path is simulated against the deployed contract with state overrides — measured costs: hold a spot $0.0038, door refund $0.0025, claim $0.0012.
- v2 adds editable details, optional public display names (`rsvpAs` sets one while holding a spot), and claims that settle the event themselves once check-in closes.

### Web app

Next.js 16 (App Router) · React 19 · Tailwind 4 · wagmi 3 / viem · injected (EIP-6963) wallets.

| Route | Purpose |
| --- | --- |
| `/` | Landing page with a live ticket demo |
| `/app` | Your events: going and hosting, with what needs doing now and new RSVPs since you last looked |
| `/app/new` | Create an event with a live ticket preview; starts from your usual venue/deposit, or `?from=<id>` to run an event again |
| `/app/events/[id]` | Organizer console: stats, invite link + QR + ready-made invite message, named guest list, manual check-in, CSV export, edit details, settle, cancel |
| `/app/events/[id]/door` | Door mode: camera scanner, door key setup, "Ada is in" results, install hint |
| `/app/activity` | Every deposit held, returned, forfeited or earned; show-up record |
| `/app/settings` | Display name, what's public, door keys on this device |
| `/e/[id]` | Guest page: hold a spot (with your name), live ticket, add to calendar, map, who's going, organizer track record, check-in moment, claims |

```
web/src
├── app/                 routes (thin: parse params, render feature components)
├── components/
│   ├── ui/              design-system primitives (Button, Field, Segmented, Dialog, Skeleton)
│   ├── event/           TicketStub, create form, phase label
│   ├── guest/ organizer/ door/ home/ landing/   feature components
│   └── wallet/          connect dialog, account menu, connect prompts
├── domain/              pure, unit-tested logic: event phases, guest view states,
│                        create-event validation, ticket QR codes
├── hooks/               contract reads (use-shwup), staged writes, door + door key
├── lib/                 money (18-dec USDC), errors → human copy, time, generated ABI
└── config/chain.ts      one chain per deployment: arc | arcTestnet | local
```

Design choices worth knowing:

- **Every write is staged**: *Preparing → Confirm in your wallet → Settling on Arc → Done*, with the measured finality time.
  Calls are simulated first so contract errors (event full, too late to cancel…) become sentences
  before any wallet prompt. Every revert maps to a title, a next step, and whether money moved.
- **One function decides what a guest sees** (`domain/guest.ts`), so the event page, the home list
  and the ticket can't disagree.
- **Door keys** live only in the organizer's browser and can only check guests in for one event —
  a leaked key refunds guests, nothing else.

## Local development

Requirements: Node 22+, pnpm 10, Foundry.

```bash
git clone --recursive https://github.com/successaje/shwup && cd shwup
pnpm install

# Terminal 1 — anvil + a seeded ShwUp deployment (writes web/.env.local)
pnpm dev:chain

# Terminal 2 — the app on http://localhost:3100
pnpm --filter web dev --port 3100
```

The local build lists anvil's funded test accounts in the wallet picker (organizer + guests), so
every flow works without a browser extension. These connectors exist only when
`NEXT_PUBLIC_SHWUP_CHAIN=local`.

## Environment

`web/.env.example`:

| Variable | |
| --- | --- |
| `NEXT_PUBLIC_SHWUP_CHAIN` | `arc`, `arcTestnet` or `local` |
| `NEXT_PUBLIC_SHWUP_ADDRESS` | Deployed ShwUp contract |
| `NEXT_PUBLIC_SHWUP_DEPLOY_BLOCK` | Deployment block (lower bound for receipt lookups) |
| `NEXT_PUBLIC_SHWUP_RPC_URL` | Optional RPC override |
| `NEXT_PUBLIC_SITE_URL` | Optional canonical URL for link previews |

## Testing

```bash
pnpm test               # web unit tests (vitest) + contract tests (forge)
pnpm --filter web lint
pnpm --filter web typecheck
cd contracts && forge test -vvv
```

CI runs contract fmt/build/tests and web lint/typecheck/tests/build on every pull request.

## Deployment

**Contract** (needs a Foundry keystore account funded with a little USDC):

```bash
cast wallet import shwup-deployer --interactive
./scripts/deploy-contract.sh arcTestnet shwup-deployer   # or: arc
```

The script deploys, verifies the source on Arc's Blockscout explorer, records the address in
`contracts/deployments/<chainId>.json`, and prints the three `NEXT_PUBLIC_SHWUP_*` values for the web app.

**Web** (Vercel, root directory `web`, Node 22): set the three variables with `vercel env add`, then
build locally against the pinned lockfile and ship the output:

```bash
vercel link --project shwup          # at the repo root; project root directory: web
vercel pull --environment=production
vercel build --prod && vercel deploy --prebuilt --prod
```

## Deployments

| Network | Chain ID | ShwUp |
| --- | --- | --- |
| Arc Testnet | 5042002 | [`0x191e7817E6fAafF2169660e6F13f2f3197ecBC9C`](https://explorer.testnet.arc.io/address/0x191e7817E6fAafF2169660e6F13f2f3197ecBC9C?tab=contract) (verified) |
| Arc Mainnet | 5042 | _pending_ |

## Repository

```
contracts/   Foundry project: ShwUp.sol, tests, deploy + local seed scripts
web/         Next.js app
scripts/     dev chain runner, ABI export, contract deploy
docs/        product model, production audit + backlog, build log, demo script
```

## License

MIT
