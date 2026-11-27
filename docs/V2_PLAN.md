# ShwUp v2 — the best version, and how we get there

Status: proposal, November 2026. ShwUp v1 won an Arc Microgrant (one of 20). v2 is about turning a
winning prototype into a product a stranger can use without help, that looks and feels
first-class, and that a Circle grant committee can fund with confidence.

---

## 1. Where we are, honestly

**Strong**
- A real, verified contract on Arc mainnet with no owner, 74 tests, a fuzzed solvency invariant and
  an independent review. Hand-overs, bonds, causes, nobody-checked-in refunds.
- The core moment works on mainnet: hold $1 on a phone, scan at the door, "+$1.00, final in 0.4s".
- Shipped in public: 38 reviewed PRs, CI that simulates every money path on a live Arc node.

**Weak — and what reviewers will notice first**
1. **Onboarding is crypto-native.** A guest needs MetaMask, the Arc network, and USDC on Arc. On
   mobile that meant wallet-browser workarounds, network-switch errors and blocked RPCs.
2. **MetaMask flags shwup.vercel.app as malicious.** Real guests see a red warning and leave.
3. **No accounts beyond a wallet.** No profile photo, no email, no reminders, no organizer page.
4. **No traction yet.** One mainnet event, our own.
5. **The front end is good but not yet a brand.** Few marketing pages, a plain footer, no brand kit,
   no legal/help pages, no event cover images.

---

## 2. Positioning and brand

### Positioning
- **Consumer line (unchanged):** *Commit. Show up. Get it back.*
- **What it is:** *Refundable commitments, settled in USDC on Arc.*
- **For grants and partners:** *The commitment layer for reservations* — events first; then tables,
  appointments, classes, office hours — through the app, hosted checkout links and an API.

### Name and domain
- Keep **ShwUp**: it won under that name and it's memorable. Pronounced "show up".
- Buy a real domain and move off `vercel.app` (also part of clearing the wallet-scanner flag).
  `shwup.com` and `shwup.co` are taken; **`shwup.io`** and **`getshwup.com`** looked unregistered on
  27 Nov 2026 (`shwup.xyz`, `shwup.app` unclear). Confirm at a registrar.

### Brand idea: *the ticket stub*
Everything comes from the object people already understand — a ticket that's torn at the door.
- **Motifs:** the perforated edge, the "ADMIT ONE" label, the **SHOWED UP** stamp, the torn stub.
- **Signature motion:** a stamp that lands with a little weight; a stub that tears along the
  perforation; money that counts back up into a wallet.
- **Voice:** plain, warm, specific, a little dry. Numbers over adjectives ("final in 0.4s", not
  "lightning fast"). Never crypto jargon on consumer screens.

### Brand kit (published at `/brand`, downloadable)
| Element | Spec |
| --- | --- |
| Logo system | Mark (ticket stub), wordmark, horizontal + stacked lockups; clear space = stub height ÷ 2; min sizes; do/don't sheet; light, dark, mono versions (SVG + PNG) |
| Colour | Paper `#f4f1e8`, Ink `#18170f`, Stamp `#d9481f`, Refund `#157347` + full light/dark token scale, AA-checked pairs |
| Type | Bricolage Grotesque (display), Geist (UI), Geist Mono (numbers, codes) — scale + usage rules |
| Iconography | Lucide, 1.75 stroke, rounded joins; custom stub/stamp/perforation glyphs |
| Motion | Durations (120/200/320 ms), easing tokens, stamp/tear/count-up specs, reduced-motion fallbacks |
| Templates | OG/social cards per event (generated), X/Farcaster cards, deck template, press screenshots |
| Voice | Short guide with before/after examples |

---

## 3. The product — best version

Three pillars. Each feature below is tagged **P0** (v2 launch), **P1** (soon after), **P2** (later).

### Pillar A — Anyone can commit (no crypto knowledge needed)
- **P0 Sign in with a passkey** (Face ID / fingerprint) — creates a smart wallet on Arc via
  **Circle Modular Wallets**. No extension, no seed phrase, no network switching. Circle docs list
  Arc mainnet as supported; other builders show passkey payments on Arc mainnet (Nov 2026). We
  verify with a real test before building on it.
- **P0 Connect a wallet** for crypto natives: injected (MetaMask, Rabby…) + **WalletConnect** (needs
  a free Reown project ID) for mobile wallets without in-app browsers.
- **P0 Add money**, in this order of preference: (1) bring USDC from another chain with Circle CCTP
  (built), (2) Circle Gateway unified balance, (3) a card on-ramp *if* one supports Arc — evaluated,
  not assumed.
- **P0 Sign-in sessions** (Sign-In With Ethereum, works for passkey accounts too) so the app can show
  your profile, tickets and organizer tools without re-prompting.
- **P1 Gas covered for guests** via a paymaster, if Circle Gas Station is live on Arc mainnet;
  otherwise the account pays its own few cents of USDC (fine on Arc — USDC *is* gas).
- **P1 Email (optional)** for reminders and receipts. Never required to commit.

> ⚠ Technical risk to test first: refunds are pushed with a 50k gas stipend. If a smart-account
> wallet needs more to receive native USDC, the refund lands in `credits` and the guest must tap
> "Collect". We test this on Arc mainnet with a Circle passkey account before shipping; if needed,
> the app auto-collects, or contract v5 raises the stipend.

### Pillar B — Organizers love running it
- **P0 Event pages that look like real event pages:** cover image, rich description, map, host,
  attendees, share sheet, generated OG image.
- **P0 Organizer profiles** (`/@handle`): photo, bio, links, upcoming events, public track record.
- **P0 Dashboard** with what needs doing now; **analytics** — RSVPs over time, show-up rate,
  forfeits, and *show-up lift* vs the organizer's own baseline.
- **P0 Waitlist UI** on full events (hand-overs already exist on-chain) + "notify me".
- **P1 Reminders:** email + calendar + wallet passes (Apple/Google, built — needs your credentials).
- **P1 Co-hosts and door staff** with roles; multiple door devices.
- **P1 Recurring events / series**, ticket questions (custom fields), CSV/Sheets export, check-in by name search.
- **P2** Communities/organizations with members and shared track record.

### Pillar C — It's infrastructure (what grants fund)
- **P1 Hosted checkout links:** `shwup.io/c/<id>` — any business sends a link, the customer commits.
- **P1 REST API + webhooks + API keys:** create commitments, read status, `checked_in`, `forfeited`.
- **P1 Embeddable "Hold my spot" button** and a React component.
- **P2 Booking integrations:** calendar/booking tools via webhooks/Zapier-style automations.
- **P2 Verification adapters** beyond QR: API callback (e.g. the venue's own system confirms arrival).

### Business model (grants weigh "a credible path to financial independence")
- **Free** for community events.
- **Pro / Venues** (monthly): API, hosted checkout, webhooks, branding, analytics, multiple doors.
- **Optional platform fee** only on forfeits an organizer *keeps* (never on deposits that return).
  Needs contract v5 — decide later, after real usage.

---

## 4. Front end — the standard

### Pages (information architecture)
**Marketing**
- Home — hero with the live ticket demo, live on-chain stats, use cases, how it works, why Arc, testimonials (once real), FAQ, final CTA.
- How it works · Use cases (Events, Restaurants, Appointments, Classes — one page each) · For developers (API, checkout, webhooks) · Pricing · Security (contract, invariants, review, Sourcify link) · About/story · Brand kit · Changelog · Help center/FAQ · Contact.
- Legal: Terms, Privacy, Cookies — plain-language, plus a "how the money works" disclosure.

**App**
- Sign in / sign up (passkey or wallet) · Onboarding (name, photo, optional email) · Dashboard · My tickets (a wallet of stubs) · Event page · Create (templates, cover image, live ticket preview) · Organizer console (analytics, guests, waitlist, door, settings) · Door mode · Activity & money · Public profile `/@handle` · Settings (profile, sign-in methods, wallets, notifications, security, export) · Checkout `/c/<id>` · 404 / 500 / maintenance.

### Design system
- Tokens for colour/space/radius/shadow/motion; light, dark and **system** themes with no flash on load; a theme toggle in header and footer.
- One component library (buttons, fields, dialogs, sheets, toasts, menus, tabs, tables, empty states, skeletons) used everywhere; stories/visual tests for each.
- Motion with Motion: page transitions, shared-element ticket transitions (invite → held ticket → stamped), count-ups, the stamp; all honour `prefers-reduced-motion`.
- Accessibility: WCAG 2.2 AA, keyboard-complete, screen-reader labels, focus states, 44px touch targets.
- Responsive from 360px up; installable PWA (built).

### The footer (it should feel like the end of a good ticket)
- A torn, perforated top edge.
- An oversized ShwUp wordmark that the SHOWED UP stamp lands on as it scrolls into view.
- **Live strip:** "Arc mainnet · block #… · $X returned at the door · Y check-ins", read from the contract.
- Link columns: Product · Use cases · Developers · Company · Legal.
- Newsletter (email, double opt-in), socials (X, Farcaster, GitHub), theme toggle, network status pill.
- Contract address with copy + Sourcify badge; "Built on Arc" badge; © line.

---

## 5. Engineering standards

- **Branch per feature, small conventional commits, pushed as we go, PR per increment, CI green before merge.**
- TypeScript strict; Zod at every boundary (forms, API, env, chain data).
- Tests: unit (Vitest), component (Testing Library), **end-to-end (Playwright)** for create → hold → door → refund on a local chain, visual regression on key pages; contract tests stay at 100% of money paths.
- Backend for off-chain data (profiles, images, emails, API keys, webhooks): Postgres (Neon or Supabase) + Next.js route handlers; image storage (Vercel Blob or S3); email (Resend). The chain stays the source of truth for money.
- Observability: error tracking (Sentry), privacy-friendly analytics (Plausible), uptime/status page.
- Security: secrets only in the host's env, never in files; rate limits on the relay and API; CSP headers; dependency audits; any contract change gets the same review + re-review process as v4.
- Releases: preview deploy per PR, production from `main`, changelog page fed by merged PRs.

---

## 6. The Circle grant

**Reality check (circle.questbook.app, 27 Nov 2026):** Cohort 2 (Fall 2026) is open — **1,031
proposals, 14 accepted** so far, $135k available. Most grants are **$10k–$20k**; $25k+ needs
demonstrated traction. Paid in USDC per milestone.

**What they judge:** platform alignment (Arc central, Circle products as building blocks) · team
(proven shipping, technical ownership) · **traction and path to success** · ecosystem impact (more
USDC utility). Minimum bar: a working product, a technical roadmap, and **a video demonstrating at
least one Circle integration**. Payments is a named priority area.

**What we bring**
- A working mainnet product + Arc Microgrant win + public build history (alignment ✓, team ✓).
- **Circle integrations to demo on video:** Modular Wallets (passkey sign-in), CCTP/App Kit
  (bring USDC from any chain), USDC as gas on Arc; optionally Gateway.
- **Traction we still need:** run 5–10 real events (meetups, classes, a restaurant pilot) before
  applying; report RSVPs, show-up rate vs before, USDC committed and returned.

**Proposed milestones (≈ $20k ask, adjust to evidence)**
| # | Milestone | Proof |
| --- | --- | --- |
| M1 | Passkey onboarding + walletless commits on Arc mainnet (Circle Modular Wallets), gas covered where possible | Live; demo video; % of guests who commit without a wallet extension |
| M2 | Hosted checkout + API + webhooks; 2 pilot partners (e.g. a venue and a booking/appointments business) | Partners live; API docs |
| M3 | Traction: N events, M commitments, $X USDC committed on Arc | Public on-chain stats page |
| M4 | Independent security audit of contract v5 before larger deposits | Published report |

**The application pack** (`docs/grant/`): one-page summary, problem/solution, Arc & Circle
architecture diagram, traction table, milestones + budget, team, 2-minute Circle-integration video,
links (app, repo, verified contract, microgrant). The form sits behind a Questbook sign-in — paste
its questions and we tailor every answer.

---

## 7. Roadmap

| Phase | Weeks | Ships |
| --- | --- | --- |
| 0 · Foundations | 1 | Domain + redirects; brand kit v1 (logo system, tokens, type, motion); design-system cleanup; theme system; new header + **footer** |
| 1 · Accounts | 1–3 | Backend + sessions; passkey sign-in (Circle) after a mainnet test; WalletConnect; onboarding; profiles `/@handle`; settings |
| 2 · Marketing site | 2–4 | Home v2, use-case pages, how it works, security, pricing, about, brand, help, legal, changelog |
| 3 · Organizer | 3–5 | Cover images, rich event pages, analytics, waitlist UI, reminders, co-hosts/door roles |
| 4 · Platform | 5–7 | Hosted checkout, API + keys, webhooks, embeddable button, developer docs |
| ∥ Traction | from week 2 | Real events every week; collect numbers and quotes |
| 5 · Grant | after ~4–6 weeks of usage | Application pack + Circle-integration video; submit to the open cohort |

---

## 8. Decisions needed from you
1. **Domain:** which one to buy (`shwup.io`, `getshwup.com`, or another you prefer).
2. **Sign-in:** passkey (Circle Modular Wallets) as the main path, wallets as the alternative — needs a Circle Console account (free) with a client key you create.
3. **Backend:** OK to add a database, image storage and email (Neon/Supabase, Vercel Blob, Resend) — small monthly cost, free tiers to start.
4. **WalletConnect:** a free Reown project ID.
5. **Business model:** free + Pro/Venues; decide on a forfeit fee later.
6. **Order:** foundations → accounts → marketing → organizer → platform (as above), or a different priority.
