/** Placeholders an admin can use in an event's WhatsApp share message. */
export const SHARE_PLACEHOLDERS = [
  "{event}",
  "{date}",
  "{time}",
  "{location}",
  "{price}",
  "{deadline}",
  "{online}",
  "{link}",
] as const;

type Key = (typeof SHARE_PLACEHOLDERS)[number] extends `{${infer K}}` ? K : never;
export type ShareVars = Record<Key, string>;

/** WhatsApp formatting: *bold*. Lines whose placeholders are all empty are dropped. */
export const DEFAULT_SHARE_MESSAGE = [
  "🙌 I'm attending *{event}*!",
  "",
  "📅 {date}",
  "🕐 {time}",
  "📍 {location}",
  "💰 {price}",
  "💻 {online}",
  "⏳ Register by {deadline}",
  "",
  "Come with me! Register here: {link}",
].join("\n");

/** What to store: null when empty or unchanged from the default, so default improvements reach every event. */
export function storedShareMessage(value: string | null | undefined) {
  const text = value?.replace(/\r\n/g, "\n").trim();
  return text && text !== DEFAULT_SHARE_MESSAGE ? text : null;
}

const PLACEHOLDER = /\{(event|date|time|location|price|deadline|online|link)\}/g;

export function fillShareMessage(template: string | null | undefined, vars: ShareVars) {
  const text = (template?.trim() || DEFAULT_SHARE_MESSAGE)
    .split("\n")
    .filter((line) => {
      const keys = [...line.matchAll(PLACEHOLDER)].map((m) => m[1] as Key);
      return keys.length === 0 || keys.some((k) => vars[k].trim());
    })
    .map((line) => line.replace(PLACEHOLDER, (_, k: Key) => vars[k]))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  // Always include the link, even if the admin's message forgot {link}.
  return text.includes(vars.link) ? text : `${text}\n${vars.link}`;
}

// Not wa.me: its redirect to api.whatsapp.com replaces every emoji with U+FFFD (shown as "?"),
// and WhatsApp then drops the garbled text, leaving only the link.
export const whatsappShareUrl = (text: string) =>
  `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
