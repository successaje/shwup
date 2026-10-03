"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { TxProgress } from "@/components/tx-progress";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { encodeDetails, LIMITS, type ShwUpEvent } from "@/domain/event";
import { shwupContract } from "@/hooks/use-shwup";
import { useStagedWrite } from "@/hooks/use-staged-write";

/** Edit name, location and description. Money terms are fixed once guests have committed. */
export function EditDetailsDialog({ event, open, onOpenChange }: { event: ShwUpEvent; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [name, setName] = useState(event.details.name);
  const [location, setLocation] = useState(event.details.location);
  const [description, setDescription] = useState(event.details.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const tx = useStagedWrite();

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim()) return setError("Name and location are required.");
    const r = await tx.run({ ...shwupContract, functionName: "updateDetails", args: [event.id, encodeDetails({ name, location, description })] });
    if (r.ok) {
      toast.success("Event updated", { description: "Guests see the new details right away." });
      onOpenChange(false);
      tx.reset();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !tx.busy && onOpenChange(o)}
      title="Edit details"
      description="The deposit, times and spots can't change — guests committed to those."
    >
      <form onSubmit={save} className="flex flex-col gap-4">
        <Field label="Event name">{(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.name} />}</Field>
        <Field label="Where">{(p) => <Input {...p} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={LIMITS.location} />}</Field>
        <Field label="About" optional>
          {(p) => <Textarea {...p} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={LIMITS.description} />}
        </Field>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <TxProgress stage={tx.stage} error={tx.error} result={tx.result} doneLabel="Saved" />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={tx.busy}>
            Cancel
          </Button>
          <Button type="submit" loading={tx.busy}>
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
