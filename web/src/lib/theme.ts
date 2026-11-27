/**
 * The person's colour theme. "system" follows the device; "light"/"dark" are explicit choices, kept
 * in a cookie so the server can render the right theme on the first paint (no flash).
 */
export type Theme = "light" | "dark" | "system";

export const THEME_COOKIE = "shwup-theme";
export const THEMES: readonly Theme[] = ["light", "dark", "system"];

/** Browser UI colour (address bar, PWA title bar) for each scheme — the paper token. */
export const THEME_COLOR = { light: "#f4f1e8", dark: "#121110" } as const;

export function parseTheme(value: string | undefined | null): Theme {
  return value === "light" || value === "dark" ? value : "system";
}

/** Cookie string for a choice: one year, whole site. */
export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
