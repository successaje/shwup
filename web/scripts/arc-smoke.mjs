// Smoke-tests ShwUp's money paths against a live Arc node, without signing anything.
//
// Uses eth_call / eth_estimateGas with state overrides on the *deployed* contract: we plant an
// event and tickets directly in its storage and give test accounts USDC, then simulate the calls a
// real user would make. This exercises Arc's actual execution layer (native USDC as msg.value,
// push refunds, gas) — the parts a local anvil chain can't vouch for.
//
//   node scripts/arc-smoke.mjs [rpcUrl] [contractAddress]
import { createPublicClient, encodeAbiParameters, getAddress, encodeFunctionData, http, keccak256, numberToHex, pad, parseEther, toHex } from "viem";
import { arcTestnet } from "viem/chains";
import { readFileSync } from "node:fs";

const rpc = process.argv[2] ?? "https://rpc.testnet.arc.io";
const shwup = process.argv[3] ?? "0xf0802c0C94beC42ac93bc7439724dF04674a7A39";
const abiSrc = readFileSync(new URL("../src/lib/contracts/shwup-abi.ts", import.meta.url), "utf8");
const abi = JSON.parse(abiSrc.slice(abiSrc.indexOf("["), abiSrc.lastIndexOf("]") + 1));

const client = createPublicClient({ chain: arcTestnet, transport: http(rpc) });
const organizer = getAddress("0x00000000000000000000000000000000000a11ce");
const guest = getAddress("0x0000000000000000000000000000000000000b0b");
const leaver = getAddress("0x000000000000000000000000000000000000c0de");
const beneficiary = getAddress("0x000000000000000000000000000000000000feed");
const EVENT_ID = 999_999n; // far beyond real ids, so it never collides with live state
const DEPOSIT = parseEther("5"); // $5 native USDC (18 decimals)

const word = (n) => pad(toHex(n), { size: 32 });
const mapSlot = (key, slot, keyType = "uint256") => BigInt(keccak256(encodeAbiParameters([{ type: keyType }, { type: "uint256" }], [key, slot])));
const eventBase = mapSlot(EVENT_ID, 2n);
const ticketSlotOf = (who) => BigInt(keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [who, mapSlot(EVENT_ID, 3n)])));

/** Pack EventInfo into its 5 fixed storage words (layout from `forge inspect ShwUp storageLayout`). */
function eventWords({
  startsAt,
  cancelCutoff,
  checkInEndsAt,
  held,
  checkedIn = 0n,
  cancelled = false,
  settled = false,
  bonus = 0n,
  policy = 0n,
  payee = 0n,
  bond = 0n,
  bondPerGuest = 0n,
}) {
  const w0 = BigInt(organizer) | (DEPOSIT << 160n);
  const w1 = startsAt | (cancelCutoff << 64n) | (checkInEndsAt << 128n) | (0n << 192n) | (held << 224n);
  const w2 = checkedIn | (policy << 32n) | ((cancelled ? 1n : 0n) << 40n) | ((settled ? 1n : 0n) << 48n) | (bonus << 56n);
  const w3 = BigInt(payee) | (bond << 160n);
  return [w0, w1, w2, w3, bondPerGuest].map((w, i) => ({ slot: numberToHex(eventBase + BigInt(i), { size: 32 }), value: word(w) }));
}

/** Ticket word: status | bonusClaimed | offered | offeredTo. */
const ticket = (status, { bonusClaimed = false, offered = false, who = guest } = {}) => ({
  slot: numberToHex(ticketSlotOf(who), { size: 32 }),
  value: word(BigInt(status) | ((bonusClaimed ? 1n : 0n) << 8n) | ((offered ? 1n : 0n) << 16n)),
});

// Calls to an address with no code "succeed" without doing anything, so check there's a contract first.
const code = await client.getCode({ address: shwup });
if (!code || code === "0x") {
  console.error(`No contract at ${shwup} on this network — nothing to test.`);
  process.exit(1);
}

const { timestamp, number } = await client.getBlock();
const gasPrice = await client.getGasPrice();
console.log(`Arc block ${number} · gas price ${Number(gasPrice) / 1e9} gwei · contract ${shwup}\n`);

const funded = (addr) => ({ address: addr, balance: parseEther("100") });

async function check(name, { from, fn, args, value = 0n, stateDiff, contractBalance = 0n }) {
  const data = encodeFunctionData({ abi, functionName: fn, args });
  const stateOverride = [funded(from), { address: shwup, balance: contractBalance, stateDiff }];
  try {
    await client.call({ account: from, to: shwup, data, value, stateOverride });
    const gas = await client.estimateGas({ account: from, to: shwup, data, value, stateOverride });
    const usd = Number(gas * gasPrice) / 1e18;
    console.log(`✓ ${name.padEnd(46)} ${String(gas).padStart(7)} gas ≈ $${usd.toFixed(5)}`);
    return true;
  } catch (e) {
    console.log(`✗ ${name}\n    ${e.shortMessage ?? e.message}`);
    return false;
  }
}

const now = timestamp;
const results = [
  await check("rsvp: native USDC deposit as msg.value", {
    from: guest,
    fn: "rsvp",
    args: [EVENT_ID],
    value: DEPOSIT,
    stateDiff: eventWords({ startsAt: now + 3600n * 24n, cancelCutoff: now + 3600n * 12n, checkInEndsAt: now + 3600n * 27n, held: 0n }),
  }),
  await check("rsvpAs: deposit + public display name", {
    from: guest,
    fn: "rsvpAs",
    args: [EVENT_ID, "Smoke Test"],
    value: DEPOSIT,
    stateDiff: eventWords({ startsAt: now + 3600n * 24n, cancelCutoff: now + 3600n * 12n, checkInEndsAt: now + 3600n * 27n, held: 0n }),
  }),
  await check("cancelRsvp: deposit pushed back to guest", {
    from: guest,
    fn: "cancelRsvp",
    args: [EVENT_ID],
    contractBalance: DEPOSIT,
    stateDiff: [...eventWords({ startsAt: now + 3600n * 24n, cancelCutoff: now + 3600n * 12n, checkInEndsAt: now + 3600n * 27n, held: 1n }), ticket(1)],
  }),
  await check("checkIn: door refund pushed to guest", {
    from: organizer,
    fn: "checkIn",
    args: [EVENT_ID, guest],
    contractBalance: DEPOSIT,
    stateDiff: [...eventWords({ startsAt: now + 600n, cancelCutoff: now, checkInEndsAt: now + 3600n * 3n, held: 1n }), ticket(1)],
  }),
  await check("settle: forfeit credited to organizer", {
    from: guest,
    fn: "settle",
    args: [EVENT_ID],
    contractBalance: DEPOSIT,
    stateDiff: [...eventWords({ startsAt: now - 7200n, cancelCutoff: now - 9000n, checkInEndsAt: now - 60n, held: 1n, policy: 1n })],
  }),
  await check("claim: bonus share pushed to attendee", {
    from: guest,
    fn: "claim",
    args: [EVENT_ID],
    contractBalance: DEPOSIT,
    stateDiff: [...eventWords({ startsAt: now - 7200n, cancelCutoff: now - 9000n, checkInEndsAt: now - 60n, held: 2n, checkedIn: 1n, settled: true, bonus: DEPOSIT }), ticket(2)],
  }),
  await check("takeSpot: deposit passed to the guest leaving", {
    from: guest,
    fn: "takeSpot",
    args: [EVENT_ID, leaver],
    value: DEPOSIT,
    contractBalance: DEPOSIT,
    stateDiff: [...eventWords({ startsAt: now + 3600n, cancelCutoff: now - 60n, checkInEndsAt: now + 3600n * 4n, held: 1n }), ticket(1, { offered: true, who: leaver })],
  }),
  await check("settle: forfeit credited to beneficiary", {
    from: guest,
    fn: "settle",
    args: [EVENT_ID],
    contractBalance: DEPOSIT,
    stateDiff: eventWords({ startsAt: now - 7200n, cancelCutoff: now - 9000n, checkInEndsAt: now - 60n, held: 1n, policy: 2n, payee: beneficiary }),
  }),
  await check("cancelEvent: bond split, dust back to organizer", {
    from: organizer,
    fn: "cancelEvent",
    args: [EVENT_ID],
    contractBalance: DEPOSIT * 3n + parseEther("10"),
    stateDiff: eventWords({ startsAt: now + 3600n * 24n, cancelCutoff: now + 3600n * 12n, checkInEndsAt: now + 3600n * 27n, held: 3n, bond: parseEther("10") }),
  }),
  await check("withdrawCreditsFor: settlement credit delivered to its owner", {
    from: guest,
    fn: "withdrawCreditsFor",
    args: [organizer],
    contractBalance: DEPOSIT,
    stateDiff: [{ slot: numberToHex(mapSlot(organizer, 8n, "address"), { size: 32 }), value: word(DEPOSIT) }],
  }),
  await check("claim: refund when nobody was checked in", {
    from: guest,
    fn: "claim",
    args: [EVENT_ID],
    contractBalance: DEPOSIT,
    stateDiff: [...eventWords({ startsAt: now - 7200n, cancelCutoff: now - 9000n, checkInEndsAt: now - 60n, held: 1n, settled: true }), ticket(1)],
  }),
  await check("claim: deposit + bond share after cancellation", {
    from: guest,
    fn: "claim",
    args: [EVENT_ID],
    contractBalance: DEPOSIT + parseEther("5"),
    stateDiff: [
      ...eventWords({ startsAt: now + 3600n * 24n, cancelCutoff: now + 3600n * 12n, checkInEndsAt: now + 3600n * 27n, held: 1n, cancelled: true, bond: parseEther("5"), bondPerGuest: parseEther("5") }),
      ticket(1),
    ],
  }),
];

const failed = results.filter((ok) => !ok).length;
console.log(failed ? `\n${failed} check(s) failed` : "\nAll money paths work on Arc.");
process.exit(failed ? 1 : 0);
