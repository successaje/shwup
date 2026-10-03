"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: ReactNode; description?: ReactNode };

/** Radio group rendered as side-by-side choices. Use `cards` for options that need a description. */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  cards,
  className,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  cards?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        cards ? "grid gap-2 sm:grid-cols-2" : "inline-flex rounded-md border border-line-strong bg-surface p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const checked = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              "cursor-pointer transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
              cards
                ? cn(
                    "flex flex-col gap-1 rounded-md border px-3.5 py-3",
                    checked ? "border-ink bg-surface" : "border-line-strong bg-surface/60 hover:border-ink-3",
                  )
                : cn(
                    "num flex h-9 min-w-12 items-center justify-center rounded-sm px-3 text-sm",
                    checked ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
                  ),
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {cards ? (
              <>
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-3.5 place-items-center rounded-full border",
                      checked ? "border-ink" : "border-line-strong",
                    )}
                  >
                    {checked && <span className="size-1.5 rounded-full bg-ink" />}
                  </span>
                  {o.label}
                </span>
                {o.description && <span className="pl-5.5 text-xs leading-relaxed text-ink-2">{o.description}</span>}
              </>
            ) : (
              o.label
            )}
          </label>
        );
      })}
    </div>
  );
}
