/**
 * Substitute `{{variable}}` tokens in a template using a flat data map.
 * Missing variables resolve to an empty string. Keys are case-sensitive.
 */
export function renderTemplate(
  template: string,
  data: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const value = data[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

/**
 * Chunk an array into batches of at most `size`. Used to throttle provider
 * calls (Resend allows ~100/sec, Hubtel batches up to 1000).
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * Normalize a Ghana phone number to E.164 (+233...). Accepts 0244..., 233...,
 * +233..., and 10-digit local numbers. Returns null if it can't be parsed.
 */
export function normalizeGhanaPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("233") && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+233${digits.slice(1)}`;
  if (digits.length === 9) return `+233${digits}`;
  if (input.startsWith("+")) return input;
  return null;
}
