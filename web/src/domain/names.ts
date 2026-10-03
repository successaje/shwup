/** Contract limit for display names (bytes, not characters). */
export const MAX_NAME_BYTES = 32;

export function nameByteLength(name: string) {
  return new TextEncoder().encode(name).length;
}

/** Trim and validate a display name; returns an error message or null. */
export function validateName(raw: string): string | null {
  const name = raw.trim();
  if (nameByteLength(name) > MAX_NAME_BYTES) return "Keep it under 32 characters.";
  return null;
}
