import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-start justify-center gap-5 px-4 py-20">
      <Wordmark />
      <h1 className="font-display text-3xl font-medium tracking-tight">No such page</h1>
      <p className="text-ink-2">If someone sent you an invite, check the link — it should look like shwup.app/e/12.</p>
      <ButtonLink href="/app" variant="secondary">
        Go to your events
      </ButtonLink>
    </main>
  );
}
