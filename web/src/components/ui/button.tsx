import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "ok";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,transform,opacity] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/88",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink-3 hover:bg-sunken/50",
  ghost: "text-ink-2 hover:bg-sunken/70 hover:text-ink",
  danger: "border border-danger/30 bg-danger-soft text-danger hover:border-danger/60",
  ok: "bg-ok text-white hover:bg-ok/90 dark:text-sunken",
};

const sizes: Record<Size, string> = {
  sm: "h-9 rounded-sm px-3 text-sm",
  md: "h-11 rounded-md px-4 text-[0.9375rem]",
  lg: "h-13 rounded-md px-5 text-base",
};

type Common = { variant?: Variant; size?: Size; block?: boolean; loading?: boolean; icon?: ReactNode };

export function buttonClass({ variant = "primary", size = "md", block }: Common = {}) {
  return cn(base, variants[variant], sizes[size], block && "w-full");
}

export function Button({
  variant,
  size,
  block,
  loading,
  icon,
  className,
  children,
  disabled,
  ...props
}: Common & ComponentProps<"button">) {
  return (
    <button
      className={cn(buttonClass({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, block, icon, className, children, ...props }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(buttonClass({ variant, size, block }), className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
