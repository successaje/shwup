import { ArrowUpRight } from "lucide-react";
import { chainKey, explorerUrl, shwupAddress } from "@/config/chain";
import { protocolStats } from "@/domain/stats";
import { readAllEvents } from "@/lib/server/read-event";
import { formatUsd } from "@/lib/money";

/**
 * What ShwUp has actually done, read from the contract on Arc (regenerated with the page, at most
 * once a minute). Hidden until there's something real to show.
 */
export async function LiveStats() {
  const events = await readAllEvents();
  if (!events) return null;
  const s = protocolStats(events);
  if (s.events === 0) return null;

  const where = chainKey === "arc" ? "Live on Arc" : chainKey === "arcTestnet" ? "Live on Arc testnet" : "Local chain";
  const contract = shwupAddress ? explorerUrl("address", shwupAddress) : undefined;
  const items = [
    { label: "Returned at the door", value: formatUsd(s.returnedAtDoor) },
    { label: "Guests checked in", value: s.checkIns.toLocaleString("en-US") },
    { label: "Held for upcoming events", value: formatUsd(s.heldNow) },
    { label: "Events", value: s.events.toLocaleString("en-US") },
  ];

  return (
    <section aria-label="ShwUp on Arc, live" className="border-y border-line bg-surface/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2 text-sm text-ink-2">
          <span className="size-2 animate-pulse rounded-full bg-ok" aria-hidden />
          {where}
          {contract && (
            <a href={contract} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-ink-3 hover:text-ink">
              · from the contract <ArrowUpRight className="size-3" />
            </a>
          )}
        </p>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-4">
          {items.map((i) => (
            <div key={i.label}>
              <dd className="num text-xl">{i.value}</dd>
              <dt className="text-xs text-ink-3">{i.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
