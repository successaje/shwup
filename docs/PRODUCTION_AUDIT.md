# Production audit

Audit of ShwUp as built (PRs #1–#10), against the question: *what would make this a product people
use every week, not a hackathon submission?*

## What exists today

| Area | State |
| --- | --- |
| Contract | `ShwUp.sol` on Arc testnet, verified. Events, payable RSVPs, door checkers, check-in refunds, settlement, claims. 40 tests + solvency invariant. **All money paths confirmed on a live Arc node** (`web/scripts/arc-smoke.mjs`): rsvp $0.0038, check-in $0.0025, claim $0.0012. |
| Identity | Wallet only (EIP-6963 injected). No names, no profile. Organizers see `0x7099…79C8` in their guest list. |
| Data | 100% on-chain reads. No backend, no database. Event details are JSON stored on-chain, **immutable after creation**. |
| Pages | `/` landing · `/app` home · `/app/new` · `/app/events/[id]` console · `/app/events/[id]/door` · `/e/[id]` guest page · 404 · error |
| Persistence | Wallet session (cookie), door keys (localStorage). Nothing else is remembered. |
| Notifications | None. Guests have no reminder that the event is tomorrow. |
| History | None beyond the home list. No record of "what happened with my money". |
| Analytics | None. |
| Mobile | Responsive; not installable. Door mode is a phone workflow living in a browser tab. |
| Deployment | Vercel (prebuilt), Arc testnet. |

## Feature maturity

| Feature | Maturity | What's missing to be production-ready |
| --- | --- | --- |
| Create event | Polished | Can't **edit** after creating (a typo is permanent). Doesn't remember the venue/deposit you always use. No "run it again next week". |
| Guest page | Polished | No **add to calendar**, no map link, no timezone, links in descriptions aren't clickable. Nothing reminds the guest to come. |
| Check-in moment | Production-ready | — |
| Door mode | Polished | Results show addresses, not **names**. Not installable as an app. Gas estimate copy was optimistic (fixed numbers now known). |
| Organizer console | Functional | Guest list is anonymous; no **export**; no edit; no organizer track record. |
| Settlement | Functional | Someone has to remember to press "Settle". Guests owed a bonus can't collect until then. |
| Home | Polished | No "what changed since you last looked". |
| History | Missing | — |
| Settings / profile | Missing | — |
| Trust signals | Functional | Guests can't see whether an organizer is reliable, or a guest whether *they* are trusted. |

## Competitor benchmark

| Product | What they do that we should support | Where they're weak | One step beyond |
| --- | --- | --- | --- |
| **Luma** | Guest names & profiles, add-to-calendar, reminders, CSV export, duplicate event, check-in app | No-shows cost nothing; paid-ticket refunds are manual | Refunds at the door are automatic and final in under a second |
| **Partiful** | Delightful invite page, guest list visible to guests, text reminders | No commitment mechanism at all | Commitment without charging anyone who shows up |
| **Eventbrite** | Organizer analytics, attendance rate, payouts | Fees on small tickets; refunds take days | $0.0025 per refund; deposits never touch the organizer |
| **Meetup** | Recurring events, group history, "attendance reliability" informal norms | RSVP counts are fiction | A verifiable, on-chain show-up record |
| **Kickback (2018)** | Same core idea | Volatile deposit token, expensive gas — failed | Dollar deposits, sub-cent fees |

The common baseline we lack: **names, calendar, edit, duplicate, export.** The thing none of them have:
**a verifiable show-up record** — which only gets more valuable as history accumulates.

## The moat

If someone cloned the UI tomorrow, what would still make ShwUp better? **Accumulated, verifiable
attendance history.** Every check-in is an on-chain fact. Over time that gives:

- **Organizer track record** — "4 events · 86% of RSVPs showed up". Guests trust organizers who
  historically check people in (important under the *organizer keeps forfeits* policy, where the
  organizer has an incentive not to scan).
- **Guest reliability** — "showed up to 9 of 10". Later: organizers can waive or lower deposits for
  reliable guests. This is the long-term loop no competitor can copy without the history.

## Lifecycle

| When | Today | Target |
| --- | --- | --- |
| Day 0 | Guest holds a spot | Guest holds a spot, adds it to their calendar, sets a name |
| Day 1 | Nothing brings them back | Calendar reminder; ticket on home |
| Event day | Ticket works | Ticket, map link, "doors open" status on home |
| Week 1 | Bonus sits unclaimed until someone settles | Bonus collectable without waiting on the organizer |
| Month 1 | — | History of every deposit and return; organizer duplicates their weekly event in one click |
| Month 6 | — | Show-up record and organizer track record make switching costly |

## Scorecard (before this pass)

| Category | Score | Why below 9 / what fixes it |
| --- | --- | --- |
| Product clarity | 8 | Landing is clear; app lacks "what is this person's name" context |
| UX | 7 | No edit, no calendar, settle depends on someone remembering |
| UI | 8 | Consistent system; some screens dense on mobile |
| Personalization | 3 | Remembers nothing about the user |
| Onboarding | 6 | Getting USDC on Arc is unexplained beyond a link |
| Responsiveness | 8 | Good; not installable |
| Mobile quality | 6 | Door mode should be an installable app |
| Performance | 8 | Fine at current scale; home fans out N reads |
| Loading states | 8 | Skeletons + staged txs everywhere |
| Errors | 8 | Mapped and humane; RPC vs not-found distinguished |
| Empty states | 8 | Present and directive |
| Architecture | 8 | Clean layers; no backend (deliberate) |
| Reliability | 8 | Money paths verified on Arc; no monitoring |
| Security | 7 | Contract tested; door-key tradeoff documented; sockpuppet-attendee split dilution undocumented |
| Documentation | 8 | Thorough; needs audit/limitations section |
| User retention | 3 | No reasons to return; no history |
| Discoverability | 7 | Small app, fine |
| Growth | 5 | Invite links work; nothing turns a guest into a host |
| Accessibility | 7 | Labels/focus OK; not fully audited |
| **Overall maturity** | **6.5** | |

## Backlog

Difficulty: S (≤ half day), M (≤ 1 day), L (> 1 day).

### Critical

| # | Problem | Change | Why / impact | Diff. | Affects |
| --- | --- | --- | --- | --- | --- |
| C1 | Contract never exercised on a real Arc node | Live-node smoke test via state-override `eth_call` | Proves the product works where it'll run | S ✅ | `web/scripts/arc-smoke.mjs` |
| C2 | Event details immutable — a typo or venue change is permanent | `updateDetails` (organizer, before start) | Basic expectation of any event tool | S | contract, console |
| C3 | Organizers see addresses, not people | Optional public display name per wallet (`setName`), shown in guest list, door results, ticket | The guest list is useless without names | M | contract, profile, console, door |
| C4 | Bonuses wait on someone pressing Settle | `claim` settles automatically when check-in has closed | Removes a dependency on the organizer | S | contract, guest page |

*C2–C4 change the contract, and mainnet hasn't been deployed — this is the cheapest moment to make them.*

### High impact

| # | Problem | Change | Diff. | Affects |
| --- | --- | --- | --- | --- |
| H1 | Nothing reminds a guest to come | Add to calendar (Google + .ics with a reminder) | S | guest page |
| H2 | Location is plain text | Map link; timezone shown; links in descriptions clickable | S | guest page |
| H3 | Organizers re-type the same event weekly | "Run it again" (duplicate with next week's date) + remember last deposit/venue/policy | S | console, create form |
| H4 | No export | Guest list CSV (name, address, status) | S | console |
| H5 | Door key copy overstated capacity | Use measured Arc costs | S ✅ | door mode |

### Product depth

| # | Problem | Change | Diff. | Affects |
| --- | --- | --- | --- | --- |
| D1 | No memory of money movements | Activity page: human-readable history from contract events ("Got $5.00 back at the door") | M | `/app/activity` |
| D2 | Guests can't judge organizers | Organizer track record on the guest page (events hosted, show-up rate) | M | guest page |
| D3 | No profile/settings | `/app/settings`: display name, what's public, door keys on this device | S | new page |

### Personalization

| # | Change | Diff. |
| --- | --- | --- |
| P1 | Create form remembers your last venue, deposit, policy, windows | S |
| P2 | Home shows "3 new RSVPs since you last looked" per hosted event | S |
| P3 | Name prompt after first RSVP; name reused everywhere afterwards | S (with C3) |

### Growth

| # | Change | Diff. |
| --- | --- | --- |
| G1 | After check-in: "Hosting something? Use ShwUp for your next event" | S |
| G2 | "Copy invite message" with event details, ready for group chats | S |
| G3 | Public guest count + names on the invite page (social proof, Partiful-style) | S (with C3) |

### Mobile

| # | Change | Diff. |
| --- | --- | --- |
| M1 | PWA: manifest, icons, standalone display, door mode as a home-screen app | S |
| M2 | WalletConnect so phone users can connect from any browser (needs a Reown project ID) | S + owner input |

### Engineering

| # | Change | Diff. |
| --- | --- | --- |
| E1 | Smoke test in CI against Arc testnet | S |
| E2 | Privacy-respecting analytics (Vercel Web Analytics: page views; on-chain data covers activation/usage) | S + owner input |
| E3 | Document the attendee-split dilution risk (organizer can add sockpuppet attendees) and the organizer-policy scanning incentive | S |

### Future bets (not now)

- Deposit waivers for reliable guests (needs the history from D1/D2 first).
- Get-USDC flow inside the app via Circle Bridge Kit / Gateway.
- Email/Telegram reminders (needs a backend and consent).
- Recurring series with a shared guest list; co-organizers; paid tickets alongside deposits.
- Organizer API/webhooks for check-in events.

## Priority for this pass

1. **Contract v2** (C2, C3, C4) — before mainnet, or never.
2. **Guest utility** (H1, H2, G1) — calendar is the reminder system without a backend.
3. **Names everywhere** (C3 UI, P3, D3, G3).
4. **Organizer workflow** (H3, H4, P1, G2).
5. **History + trust** (D1, D2, P2).
6. **Installable** (M1), engineering (E1, E3).

---

## Re-audit after this pass (PRs #11–#19)

### Shipped

| Backlog | What | PR |
| --- | --- | --- |
| C1 | Live-Arc smoke test of every money path, in CI | #11 |
| C2 C3 C4 | Contract v2: editable details, public display names (`rsvpAs`), self-settling claims; redeployed + verified | #12, #13 |
| C3 P3 D3 | Names on hold-a-spot, guest list, door, ticket; Profile & settings page | #14 |
| H1 H2 G1 G3 | Add to calendar (2h reminder), map link, time zone, clickable links, who's going, host prompt | #15 |
| H3 H4 P1 G2 | Edit details, Run it again, remembered defaults, CSV export, invite message | #16 |
| D1 D2 | Activity history + money summary + show-up record; organizer track record on invites | #17 |
| M1 | Installable PWA with door-mode install hint | #18 |
| P2 | New RSVPs since last visit | #19 |
| H5 E3 | Measured gas copy; incentive limits documented | #11, #12 |

### Scorecard now

| Category | Before | Now | Remaining gap |
| --- | --- | --- | --- |
| Product clarity | 8 | 9 | — |
| UX | 7 | 9 | Getting USDC onto Arc is still outside the app |
| UI | 8 | 9 | — |
| Personalization | 3 | 7 | Names, defaults, seen-state are per wallet/browser; no cross-device prefs (by design: no server) |
| Onboarding | 6 | 7 | Funding a wallet on Arc is the biggest drop-off risk |
| Mobile quality | 6 | 8 | WalletConnect for non-wallet browsers (needs a Reown project ID) |
| Performance | 8 | 8 | `useOrganizerEvents` fans out one read per event; fine at today's scale, multicall-batched by wagmi |
| Reliability | 8 | 9 | Money paths verified on Arc in CI |
| Security | 7 | 8 | No audit; incentive limits documented |
| User retention | 3 | 7 | Calendar reminders, activity, track record, run-it-again; no push/email (deliberately serverless) |
| Growth | 5 | 7 | Invite message, who's going, host prompt; no referral mechanics yet |
| Accessibility | 7 | 8 | Not tested with a screen reader end to end |
| **Overall maturity** | **6.5** | **8** | |

### What would still reveal "hackathon project" next to Luma or Partiful

1. **Guests need a funded Arc wallet.** Luma takes an email. → Next: in-app "get USDC on Arc" (Circle Bridge Kit / Gateway) and WalletConnect.
2. **No reminders beyond the calendar.** → Email/Telegram reminders need a small backend and consent; worth it once there are real users.
3. **No real usage yet.** → Run the first real event on mainnet; the track record and show-up history only become persuasive with data.
4. **Single organizer per event.** → Co-hosts (multiple checkers already exist on-chain; needs UI to authorize another person's wallet, not just a door key).
