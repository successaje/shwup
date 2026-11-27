"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { parseTheme, THEME_COLOR, THEME_COOKIE, themeCookie, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const noop = () => () => {};

function readCookie(): Theme {
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  return parseTheme(match?.[1]);
}

/** Apply a theme now and remember it. The server reads the same cookie on the next request. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
  document.cookie = themeCookie(theme);

  // Keep the browser UI colour (address bar, installed-app title bar) in step.
  const scheme = theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", THEME_COLOR[scheme]));
}

/**
 * Light / Dark / System as a compact segmented control. `size="sm"` is icon-only, for headers and
 * footers; the default shows labels, for settings.
 */
export function ThemeToggle({ size = "md", className }: { size?: "sm" | "md"; className?: string }) {
  // The stored choice, read after hydration (the server can't tell "system" from the device setting).
  const stored = useSyncExternalStore(noop, readCookie, () => null);
  const [picked, setPicked] = useState<Theme | null>(null);
  const theme = picked ?? stored;

  const choose = (t: Theme) => {
    setPicked(t);
    applyTheme(t);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn("inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => choose(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full text-ink-3 transition-colors duration-200 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
              size === "sm" ? "size-7 justify-center" : "h-8 px-3 text-sm",
              active && "bg-ink text-paper hover:text-paper",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {size === "md" && <span>{label}</span>}
          </button>
        );
      })}
    </div>
  );
}
