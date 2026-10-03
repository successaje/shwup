"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { parseEventLogs } from "viem";
import { useConnection } from "wagmi";
import { TicketStub } from "@/components/event/ticket-stub";
import { TxProgress } from "@/components/tx-progress";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { ConnectDialog } from "@/components/wallet/connect-dialog";
import {
  buildCreateEvent,
  CANCEL_OPTIONS,
  defaultForm,
  defaultsFromForm,
  DEPOSIT_PRESETS,
  DOORS_OPTIONS,
  type CancelOption,
  type CreateEventForm as Form,
  type DoorsOption,
  type FormErrors,
} from "@/domain/create-event";
import { ForfeitPolicy, LIMITS } from "@/domain/event";
import { shwupContract } from "@/hooks/use-shwup";
import { useStagedWrite } from "@/hooks/use-staged-write";
import { shwupAbi } from "@/lib/contracts/shwup-abi";
import { formatUsd, parseUsd } from "@/lib/money";
import { saveOrganizerDefaults } from "@/lib/organizer-prefs";

export function CreateEventForm({ initial }: { initial?: Form }) {
  const router = useRouter();
  const { address } = useConnection();
  const [form, setForm] = useState<Form>(() => initial ?? defaultForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const tx = useStagedWrite();

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const deposit = parseUsd(form.deposit) ?? 0n;
  const customDeposit = !(DEPOSIT_PRESETS as readonly string[]).includes(form.deposit);
  const bondValue = (form.bond.trim() && parseUsd(form.bond)) || 0n;
  const noShowsTo =
    form.forfeit === ForfeitPolicy.Attendees ? "people who came" : form.forfeit === ForfeitPolicy.Organizer ? "you" : form.cause.trim() || "your cause";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const built = buildCreateEvent(form);
    if (!built.ok) {
      setErrors(built.errors);
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    if (!address) {
      setConnectOpen(true);
      return;
    }
    const result = await tx.run({ ...shwupContract, functionName: "createEvent", args: built.args, value: built.value });
    if (!result.ok) return;
    const [created] = parseEventLogs({ abi: shwupAbi, eventName: "EventCreated", logs: result.receipt.logs });
    saveOrganizerDefaults(defaultsFromForm(form));
    if (created) router.push(`/app/events/${created.args.eventId}?created=1`);
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-5">
          <Field label="Event name" error={errors.name}>
            {(p) => (
              <Input
                {...p}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={LIMITS.name}
                placeholder="Arc Builders Night"
                autoComplete="off"
              />
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Starts" error={errors.startsAt}>
              {(p) => (
                <Input {...p} type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              )}
            </Field>
            <Field label="Spots" optional hint="Leave blank for no limit." error={errors.capacity}>
              {(p) => (
                <Input
                  {...p}
                  inputMode="numeric"
                  value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value.replace(/\D/g, ""))}
                  placeholder="No limit"
                />
              )}
            </Field>
          </div>
          <Field label="Where" error={errors.location}>
            {(p) => (
              <Input
                {...p}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                maxLength={LIMITS.location}
                placeholder="Venue and address"
              />
            )}
          </Field>
          <Field label="About" optional error={errors.description}>
            {(p) => (
              <Textarea
                {...p}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                maxLength={LIMITS.description}
                placeholder="What should people know before they commit?"
              />
            )}
          </Field>
        </section>

        <section className="flex flex-col gap-5 border-t border-line pt-8">
          <div>
            <h2 className="font-display text-lg font-medium tracking-tight">Deposit</h2>
            <p className="mt-1 text-sm text-ink-2">
              Guests pay this to hold a spot and get it back the moment you scan them in.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              name="deposit"
              value={customDeposit ? "" : form.deposit}
              onChange={(v) => set("deposit", v)}
              options={DEPOSIT_PRESETS.map((d) => ({ value: d, label: `$${d}` }))}
            />
            <div className="relative w-32">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3">$</span>
              <Input
                aria-label="Custom deposit in dollars"
                aria-invalid={errors.deposit ? true : undefined}
                inputMode="decimal"
                value={customDeposit ? form.deposit : ""}
                onChange={(e) => set("deposit", e.target.value)}
                placeholder="Other"
                className="num pl-7"
              />
            </div>
          </div>
          {errors.deposit && (
            <p className="-mt-2 text-xs text-danger" role="alert">
              {errors.deposit}
            </p>
          )}

          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-sm font-medium">If someone doesn&apos;t show up</legend>
            <Segmented
              cards
              name="forfeit"
              value={String(form.forfeit)}
              onChange={(v) => set("forfeit", Number(v) as ForfeitPolicy)}
              options={[
                {
                  value: String(ForfeitPolicy.Attendees),
                  label: "Split it among people who came",
                  description: "Showing up pays. Best for meetups and free events.",
                },
                {
                  value: String(ForfeitPolicy.Organizer),
                  label: "It goes to me",
                  description: "Covers the cost of an empty seat. Best for classes and appointments.",
                },
                {
                  value: String(ForfeitPolicy.Beneficiary),
                  label: "It goes to a cause",
                  description: "A charity, community fund or next event's budget. Nobody profits from no-shows.",
                },
              ]}
            />
            {form.forfeit === ForfeitPolicy.Beneficiary && (
              <div className="mt-2 grid animate-rise gap-4 sm:grid-cols-[1fr_1.4fr]">
                <Field label="Who it's for" optional hint="Shown to guests.">
                  {(p) => (
                    <Input
                      {...p}
                      value={form.cause}
                      onChange={(e) => set("cause", e.target.value)}
                      maxLength={LIMITS.cause}
                      placeholder="Lagos Food Bank"
                    />
                  )}
                </Field>
                <Field label="Their wallet on Arc" error={errors.beneficiary} hint="Fixed once the event is created.">
                  {(p) => (
                    <Input
                      {...p}
                      value={form.beneficiary}
                      onChange={(e) => set("beneficiary", e.target.value)}
                      placeholder="0x…"
                      spellCheck={false}
                      autoComplete="off"
                      className="num"
                    />
                  )}
                </Field>
              </div>
            )}
          </fieldset>

          <Field
            label="Host bond"
            optional
            error={errors.bond}
            hint="Put money behind your own promise. If you cancel, it's split among everyone holding a spot; otherwise it comes back to you after the event."
          >
            {(p) => (
              <div className="relative w-40">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3">$</span>
                <Input
                  {...p}
                  inputMode="decimal"
                  value={form.bond}
                  onChange={(e) => set("bond", e.target.value)}
                  placeholder="None"
                  className="num pl-7"
                />
              </div>
            )}
          </Field>
        </section>

        <section className="border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink"
          >
            Cancellations and check-in
            <ChevronDown className={`size-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
          </button>
          {moreOpen && (
            <div className="mt-5 grid animate-rise gap-5 sm:grid-cols-2">
              <Field label="Guests can cancel for a refund" hint="After this, the deposit only comes back at the door.">
                {(p) => (
                  <select
                    {...p}
                    value={form.cancel}
                    onChange={(e) => set("cancel", e.target.value as CancelOption)}
                    className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-[0.9375rem] hover:border-ink-3 focus:border-ink focus:outline-none"
                  >
                    {CANCEL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Check-in stays open" hint="Starts an hour before the event.">
                {(p) => (
                  <select
                    {...p}
                    value={form.doors}
                    onChange={(e) => set("doors", e.target.value as DoorsOption)}
                    className="h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-[0.9375rem] hover:border-ink-3 focus:border-ink focus:outline-none"
                  >
                    {DOORS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label} after start
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-4 border-t border-line pt-8">
          <Button type="submit" size="lg" loading={tx.busy} className="sm:self-start">
            {address ? (bondValue > 0n ? `Create event · post ${formatUsd(bondValue)} bond` : "Create event") : "Connect wallet to create"}
          </Button>
          <TxProgress stage={tx.stage} error={tx.error} result={tx.result} doneLabel="Event created" className="max-w-md" />
          <p className="max-w-md text-xs text-ink-3">
            Creating an event costs a fraction of a cent in network fees. Deposits go into the ShwUp contract, never to
            you directly.
          </p>
        </div>
      </div>

      <aside className="order-first lg:order-none">
        <div className="lg:sticky lg:top-24">
          <p className="mb-3 text-xs font-medium tracking-wide text-ink-3 uppercase">What guests will hold</p>
          <TicketStub
            state="preview"
            details={{ name: form.name, location: form.location }}
            startsAt={new Date(form.startsAt)}
            deposit={deposit}
            footnote={
              deposit > 0n &&
              (form.forfeit === ForfeitPolicy.Organizer
                ? `Back at the door. No-shows forfeit it.`
                : `Back at the door. No-shows' ${formatUsd(deposit)} goes to ${noShowsTo}.`)
            }
          />
        </div>
      </aside>

      <ConnectDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </form>
  );
}
