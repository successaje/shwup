"use client";

import { ArrowUpRight, KeyRound } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { TxProgress } from "@/components/tx-progress";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/wallet/account-button";
import { ConnectPrompt, useWalletReady } from "@/components/wallet/require-wallet";
import { chain, explorerUrl, shwupAddress } from "@/config/chain";
import { validateName } from "@/domain/names";
import { shwupContract, useMyName } from "@/hooks/use-shwup";
import { useStagedWrite } from "@/hooks/use-staged-write";
import { shortAddress } from "@/lib/address";
import { listDoorKeyEvents } from "@/lib/door-key";

export function Settings() {
  const { address, loading } = useWalletReady();
  if (loading) return <Skeleton className="h-64 max-w-xl" />;
  if (!address) {
    return <ConnectPrompt title="Profile & settings" body="Connect your wallet to set the name organizers see when you hold a spot." />;
  }
  return (
    <div className="flex max-w-xl animate-rise flex-col gap-12">
      <header>
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">Profile & settings</h1>
        <p className="mt-2 flex items-center gap-2 text-ink-2">
          <Avatar address={address} />
          <span className="num text-sm">{shortAddress(address)}</span>
        </p>
      </header>
      <NameSection address={address} />
      <PrivacySection address={address} />
      <DoorKeysSection />
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-8">
      <h2 className="font-display text-lg font-medium tracking-tight">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function NameSection({ address }: { address: `0x${string}` }) {
  const { name: saved, isLoading, refetch } = useMyName(address);
  const [draft, setDraft] = useState<string | null>(null);
  const tx = useStagedWrite();
  const value = draft ?? saved;
  const error = validateName(value);
  const dirty = value.trim() !== saved;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (error || !dirty) return;
    const r = await tx.run({ ...shwupContract, functionName: "setName", args: [value.trim()] });
    if (r.ok) {
      await refetch();
      setDraft(null);
      toast.success(value.trim() ? "Name saved" : "Name removed");
    }
  };

  return (
    <Section title="Your name" description="Organizers see it on their guest list and at the door. You can change or remove it anytime.">
      {isLoading ? (
        <Skeleton className="h-11" />
      ) : (
        <form onSubmit={save} className="flex flex-col gap-3">
          <Field label="Display name" optional error={error ?? undefined}>
            {(p) => <Input {...p} value={value} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Ada O." autoComplete="name" maxLength={40} />}
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" loading={tx.busy} disabled={!dirty || !!error}>
              Save
            </Button>
            {saved && !tx.busy && (
              <button type="button" onClick={() => setDraft("")} className="text-sm text-ink-3 hover:text-ink">
                Remove name
              </button>
            )}
          </div>
          <TxProgress stage={tx.stage} error={tx.error} result={tx.result} doneLabel="Saved" />
        </form>
      )}
    </Section>
  );
}

function PrivacySection({ address }: { address: `0x${string}` }) {
  const contract = shwupAddress ? explorerUrl("address", shwupAddress) : undefined;
  const mine = explorerUrl("address", address);
  return (
    <Section title="What's public" description="ShwUp has no servers storing your data. Everything lives on Arc, which is a public ledger.">
      <ul className="flex flex-col gap-3 text-sm text-ink-2">
        <li>
          <span className="font-medium text-ink">Public:</span> your wallet address, your display name, which events you held a spot for, and
          whether you checked in.
        </li>
        <li>
          <span className="font-medium text-ink">Never collected:</span> email, phone number, location, or anything else. There are no
          cookies beyond keeping your wallet connected.
        </li>
        <li className="flex flex-wrap gap-x-4 gap-y-1">
          {mine && (
            <a href={mine} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-ink hover:underline">
              Your activity on the explorer <ArrowUpRight className="size-3.5" />
            </a>
          )}
          {contract && (
            <a href={contract} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-ink hover:underline">
              The ShwUp contract <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </li>
      </ul>
    </Section>
  );
}

const noop = () => () => {};
let cached: { key: string; ids: bigint[] } | null = null;
function readDoorKeys() {
  if (!shwupAddress) return [];
  const ids = listDoorKeyEvents(chain.id, shwupAddress);
  const key = ids.join(",");
  if (cached?.key !== key) cached = { key, ids };
  return cached.ids;
}

function DoorKeysSection() {
  const ids = useSyncExternalStore(noop, readDoorKeys, () => [] as bigint[]);
  return (
    <Section title="Door keys on this device" description="Scanner keys this browser holds for events you run. Each can only check guests in for its own event.">
      {ids.length === 0 ? (
        <p className="text-sm text-ink-3">None. Door mode sets one up when you need it.</p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line bg-surface">
          {ids.map((id) => (
            <li key={id.toString()} className="flex items-center gap-3 px-4 py-3 text-sm">
              <KeyRound className="size-4 text-ink-3" />
              <span className="flex-1">Event #{id.toString()}</span>
              <Link href={`/app/events/${id}/door`} className="text-ink-2 hover:text-ink">
                Open door mode →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
