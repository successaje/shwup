import Link from "next/link";
import { cn } from "@/lib/cn";

/** A ticket stub with a notch — the ShwUp mark. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden>
      <path
        fill="var(--stamp)"
        d="M4 4h16a1 1 0 0 1 1 1v4.2a2.8 2.8 0 0 0 0 5.6V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4.2a2.8 2.8 0 0 0 0-5.6V5a1 1 0 0 1 1-1Z"
      />
      <path stroke="var(--paper)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="0.1 3.2" d="M15 6.5v11" />
    </svg>
  );
}

export function Wordmark({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 rounded-sm", className)} aria-label="ShwUp home">
      <Mark />
      <span className="font-display text-[1.3rem] font-bold tracking-[-0.03em]">ShwUp</span>
    </Link>
  );
}
