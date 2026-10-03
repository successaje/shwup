"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Bottom sheet on phones, centered dialog from `sm` up. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-[2px] data-[state=open]:animate-fade" />
        <D.Content
          className={cn(
            "fixed z-50 flex max-h-[88dvh] flex-col overflow-y-auto border border-line bg-surface p-5 shadow-[0_24px_48px_-24px_rgb(0_0_0/0.35)] focus:outline-none data-[state=open]:animate-rise",
            "inset-x-0 bottom-0 rounded-t-lg pb-[max(1.25rem,env(safe-area-inset-bottom))]",
            "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:w-[min(440px,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:pb-5",
            className,
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <D.Title className="font-display text-xl font-medium tracking-tight">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-sm text-ink-2">{description}</D.Description>
              ) : (
                <D.Description className="sr-only">{title}</D.Description>
              )}
            </div>
            <D.Close className="-m-1.5 grid size-9 shrink-0 place-items-center rounded-sm text-ink-3 hover:bg-sunken hover:text-ink">
              <X className="size-4.5" />
              <span className="sr-only">Close</span>
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
