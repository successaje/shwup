# Demo script

Two phones (or a laptop and a phone). Phone A is the **organizer**, phone B is a **guest**.

## 30 seconds

1. **Context** (5s) — "Free RSVPs are free to ignore. Half the list doesn't come."
2. **Action** (10s) — On phone B, open the invite link and tap **Hold my spot · $5.00**. Toast: *Final on Arc in 0.Xs.*
   The ticket shows a QR.
3. **Magic** (10s) — Phone A in **door mode** scans phone B. Phone B, untouched, flips to
   **"You're in. +$5.00"** with a *Showed up* stamp. Phone A shows *Checked in · $5.00 returned · final in 0.Xs*.
4. **Proof** (5s) — Tap *Refund receipt* on phone B: the `CheckedIn` transaction on the Arc explorer.

## 2 minutes

Add, in order:

- **Create** (20s): `/app/new`, name + time + $5, "Split it among people who came". The live ticket preview
  updates as you type. Create → console with invite link and QR.
- **Why Arc** (20s): the RSVP was one transaction — USDC is Arc's gas, so the deposit is just `msg.value`.
  Door mode's setup was one transaction that authorized the scanner *and gave it $0.25 of gas in USDC*.
- **No-shows** (30s): after check-in closes, **Settle no-shows** (anyone can call it). A guest who came
  opens their ticket: *No-shows paid you · Collect $1.25*.
- **Trust** (15s): the organizer never holds deposits — show the contract on the explorer; deposits
  only go back to guests or settle as no-shows.

## The bigger idea (30s)

ShwUp isn't an RSVP app; it's a commitment that settles itself. Show three on the same contract:

1. **Community event** — `/app/new?template=meetup`: $5, scan in, instant refund, no-shows pay the people who came.
2. **Restaurant table** — `?template=table`: $20 for one booking, back when seated, late cancel covers the table.
3. **Appointment** — `?template=appointment`: $10 for one slot, back at check-in.

Then the two things a plain deposit can't do: a guest past the cutoff **passes their spot on** (the
taker pays them back, even when it's full), and a host's **bond** that guests collect if the host cancels.

## What to have ready

- Event created ~30 minutes before the demo (check-in opens 1 hour before start).
- Phone A: door key already set up (saves a step on stage).
- Phone B: wallet with ≥ $6 USDC on Arc.
