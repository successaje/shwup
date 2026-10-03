import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-start justify-center gap-6 px-4 sm:px-6">
      <Wordmark />
      <h1 className="font-display text-4xl font-bold tracking-tight">RSVPs that mean it.</h1>
      <ButtonLink href="/app">Open ShwUp</ButtonLink>
    </main>
  );
}
