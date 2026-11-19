import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { log } from "./logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  // Query logging is off; LOG_PRISMA_QUERIES=1 turns it on (at debug level).
  const client = new PrismaClient({
    adapter,
    log: [
      { emit: "event", level: "warn" },
      { emit: "event", level: "error" },
      ...(process.env.LOG_PRISMA_QUERIES === "1"
        ? [{ emit: "event", level: "query" } as const]
        : []),
    ],
  });

  // Logged as warn (not error): Prisma also throws these, and callers often
  // catch expected ones (e.g. unique violations) — don't page PostHog for them.
  client.$on("warn", (e) => log.warn("prisma", e.message, { target: e.target }));
  client.$on("error", (e) => log.warn("prisma", e.message, { target: e.target, prismaLevel: "error" }));
  client.$on("query", (e) =>
    log.debug("prisma.query", e.query, { params: e.params, durationMs: e.duration }),
  );
  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
