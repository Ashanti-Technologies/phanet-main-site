// Self-check for the logger. Run: pnpm tsx scripts/logger-check.ts
import assert from "node:assert/strict";

Object.assign(process.env, { NODE_ENV: "production", LOG_LEVEL: "info" }); // JSON lines

async function main() {
  const { log, sanitize } = await import("../src/lib/logger");

  // Redaction + Error serialization
  const s = sanitize({ err: new Error("boom"), apiKey: "k", nested: { authorization: "Bearer x", ok: 1 } }) as any;
  assert.equal(s.apiKey, "[redacted]");
  assert.equal(s.nested.authorization, "[redacted]");
  assert.equal(s.nested.ok, 1);
  assert.equal(s.err.message, "boom");
  assert.match(s.err.stack, /boom/);

  // Level filtering + JSON output
  const lines: string[] = [];
  console.log = console.warn = (l: string) => lines.push(l);
  log.debug("t", "hidden");
  log.info("t", "shown", { password: "p", n: 2 });
  log.warn("t", "careful");
  assert.equal(lines.length, 2);
  const first = JSON.parse(lines[0]);
  assert.deepEqual([first.level, first.scope, first.msg, first.password, first.n], ["info", "t", "shown", "[redacted]", 2]);
  assert.equal(JSON.parse(lines[1]).level, "warn");

  process.stdout.write("logger-check ok\n");
}

main();
