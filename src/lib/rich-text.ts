const SCRIPT_TAG_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_RE = /\son\w+="[^"]*"/gi;
const JS_HREF_RE = /\s(href|src)="javascript:[^"]*"/gi;

export function sanitizeRichTextHtml(html: string): string {
  return html
    .replace(SCRIPT_TAG_RE, "")
    .replace(EVENT_HANDLER_RE, "")
    .replace(JS_HREF_RE, "");
}

export function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
