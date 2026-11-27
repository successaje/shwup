/**
 * The ShwUp palette as data, for the brand page and anything that needs raw values (OG images,
 * generated assets). globals.css is the source the UI uses; a test keeps the two identical.
 */
export type Swatch = { token: string; light: string; dark: string; role: string };

export const PALETTE: Swatch[] = [
  { token: "paper", light: "#f4f1e8", dark: "#121110", role: "Page background — the ticket's paper" },
  { token: "surface", light: "#fbfaf5", dark: "#1a1917", role: "Cards, inputs, raised surfaces" },
  { token: "sunken", light: "#ebe7da", dark: "#0d0c0b", role: "Wells, code, pressed states" },
  { token: "ink", light: "#18170f", dark: "#f1ede2", role: "Text and primary actions" },
  { token: "ink-2", light: "#57544a", dark: "#b3ae9f", role: "Secondary text" },
  { token: "ink-3", light: "#8a8677", dark: "#7d796d", role: "Hints, labels, metadata" },
  { token: "line", light: "#e0dbcc", dark: "#2b2925", role: "Dividers and borders" },
  { token: "line-strong", light: "#c9c3b1", dark: "#3d3a34", role: "Input borders, perforations" },
  { token: "stamp", light: "#d9481f", dark: "#ff6a3d", role: "The one accent: the mark, the stamp, emphasis" },
  { token: "stamp-soft", light: "#f8e1d6", dark: "#3a1d13", role: "Tinted stamp backgrounds" },
  { token: "ok", light: "#157347", dark: "#3fcf8e", role: "Money coming back to you — and nothing else" },
  { token: "ok-soft", light: "#dcefe2", dark: "#12291d", role: "Refund and check-in backgrounds" },
  { token: "warn", light: "#9a6400", dark: "#e7b04a", role: "Needs attention" },
  { token: "warn-soft", light: "#f6ebcf", dark: "#2d2412", role: "Warning backgrounds" },
  { token: "danger", light: "#b42318", dark: "#ff7a6e", role: "Errors and destructive actions" },
  { token: "danger-soft", light: "#f9dfdb", dark: "#34160f", role: "Error backgrounds" },
  { token: "night", light: "#18170f", dark: "#0b0a09", role: "The back of the ticket — the footer, dark in both themes" },
  { token: "night-ink", light: "#f1ede2", dark: "#f1ede2", role: "Text on night" },
  { token: "night-ink-2", light: "#a9a496", dark: "#a9a496", role: "Secondary text on night" },
  { token: "night-line", light: "#34322c", dark: "#26241f", role: "Dividers on night" },
];

/** Logo files in /public/brand, as shown and offered for download on the brand page. */
export const LOGOS = [
  { file: "lockup-light", label: "Primary lockup", note: "On light backgrounds", bg: "paper" },
  { file: "lockup-dark", label: "Primary lockup — dark", note: "On dark backgrounds", bg: "ink" },
  { file: "stacked-light", label: "Stacked", note: "Square spaces, avatars, merch", bg: "paper" },
  { file: "stacked-dark", label: "Stacked — dark", note: "Square spaces on dark", bg: "ink" },
  { file: "mark", label: "Mark", note: "Favicons, small spaces", bg: "paper" },
  { file: "app-icon", label: "App icon", note: "Home screens and stores", bg: "paper" },
  { file: "lockup-ink", label: "One colour — ink", note: "Print, single-colour use", bg: "paper" },
  { file: "lockup-paper", label: "One colour — paper", note: "Reversed out of dark", bg: "ink" },
] as const;
