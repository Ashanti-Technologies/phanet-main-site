// Server-side logger. Use this instead of console.* in server code (actions,
// route handlers, lib). Not for "use client" files — PostHog autocaptures those.
// No `server-only` import: scripts/ import code that logs.
//
// Prod: one JSON line per call (searchable in Vercel logs by scope/level).
// Dev: one readable line. Level from LOG_LEVEL (debug|info|warn|error).
// log.error also reports to PostHog error tracking (a no-op in dev).
import { after } from "next/server";
import { getPostHogClient } from "./posthog-server";

type Level = "debug" | "info" | "warn" | "error";
type Ctx = Record<string, unknown>;

const RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const isDev = process.env.NODE_ENV !== "production";
const SECRET_KEY = /password|secret|token|authorization|cookie|api_?key/i;

function minLevel(): Level {
  const l = process.env.LOG_LEVEL as Level | undefined;
  return l && l in RANK ? l : isDev ? "debug" : "info";
}

/** JSON-safe copy: Errors → {name,message,stack}, secret-looking keys redacted. */
export function sanitize(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack, ...sanitize({ ...value }, depth + 1) as object };
  }
  if (typeof value === "bigint") return value.toString();
  if (value === null || typeof value !== "object") return value;
  if (depth > 5) return "[depth]";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));
  const out: Ctx = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = SECRET_KEY.test(k) ? "[redacted]" : sanitize(v, depth + 1);
  }
  return out;
}

function write(level: Level, scope: string, msg: string, ctx?: Ctx) {
  if (RANK[level] < RANK[minLevel()]) return;
  const fields = ctx ? (sanitize(ctx) as Ctx) : {};
  const out = level === "error" ? console.error : level === "warn" ? console.warn : console.log;

  if (isDev) {
    const time = new Date().toTimeString().slice(0, 8);
    const rest = Object.keys(fields).length ? " " + JSON.stringify(fields) : "";
    out(`${time} ${level.toUpperCase()} [${scope}] ${msg}${rest}`);
  } else {
    out(JSON.stringify({ level, time: new Date().toISOString(), scope, msg, ...fields }));
  }

  if (level === "error") report(scope, msg, ctx, fields);
}

function report(scope: string, msg: string, ctx: Ctx | undefined, fields: Ctx) {
  try {
    const err = ctx?.err instanceof Error ? ctx.err : new Error(`[${scope}] ${msg}`);
    const { err: _omit, ...props } = fields;
    const sent = getPostHogClient()
      .captureExceptionImmediate(err, undefined, { scope, msg, ...props })
      .catch(() => {});
    try {
      after(sent); // keep the function alive until it's sent (request scope only)
    } catch {
      // outside a request (scripts, module init) — fire and forget
    }
  } catch {
    // logging must never throw
  }
}

export const log = {
  debug: (scope: string, msg: string, ctx?: Ctx) => write("debug", scope, msg, ctx),
  info: (scope: string, msg: string, ctx?: Ctx) => write("info", scope, msg, ctx),
  warn: (scope: string, msg: string, ctx?: Ctx) => write("warn", scope, msg, ctx),
  error: (scope: string, msg: string, ctx?: Ctx) => write("error", scope, msg, ctx),
};
