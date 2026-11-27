import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Join class names, letting later Tailwind utilities override earlier ones (`cn("px-4", "px-2")` →
 * `"px-2"`), so classes passed into a component reliably win over its defaults. Our custom font
 * sizes are registered so `text-2xs` is a size, not a colour like `text-ink-2`.
 */
const merge = extendTailwindMerge({
  extend: {
    theme: { text: ["2xs"] },
  },
});

export const cn = (...inputs: ClassValue[]) => merge(clsx(inputs));
