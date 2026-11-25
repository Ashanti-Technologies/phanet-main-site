# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Marketing + fundraising site for **Phanerosis Prayer Network International (PHANET)**.

Package manager is **pnpm** (there is a `pnpm-workspace.yaml` and `pnpm-lock.yaml` — do not switch to npm/yarn). No test runner is configured.

The Prisma client is generated into `src/app/generated/prisma` (note: inside `src/app`, not `node_modules`). Import it from `@/app/generated/prisma/client` — never edit files under that directory by hand.

## Environment

Required env vars (see `.env`): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GROQ_API_KEY`, `YOUTUBE_API_KEY`, `PAYSTACK_SECRET_KEY` (online giving; the Paystack webhook URL is `/api/payments/paystack/webhook`). Optional: `LOG_LEVEL` (debug|info|warn|error; default debug in dev, info in prod), `LOG_PRISMA_QUERIES=1` (log every Prisma query at debug).

## Architecture

### Subdomain proxy

`src/proxy.ts` is a Next.js 16 **proxy** (the renamed middleware). It rewrites a few `hoe.` paths to the Heaven on Earth event, and 308-redirects the retired `projects.` host to `/projects` on the main domain. Projects are ordinary main-site pages (`src/app/(main-site)/projects`).

### Logging

Server code logs through `log` from `src/lib/logger.ts` — `log.error("payments", "initialize failed", { reference, err })` — never `console.*`. Prod writes one JSON line per call (Vercel log search); `log.error` also reports to PostHog error tracking. Unhandled server errors are caught by `onRequestError` in `src/instrumentation.ts`. Client components keep `console.error` (PostHog autocaptures client exceptions). Self-check: `pnpm tsx scripts/logger-check.ts`.

### Serialization

Decimal/Date values from Prisma do not serialize cleanly to client components — use `src/lib/serializers/serializePrisma.ts` when passing fundraising models (Project, Commitment, PaymentIntent) from server to client.

### Server actions

Mutations triggered from React components go in `src/actions/` (Zod v4 schemas in `src/lib/schemas/`). Prefer extending these over adding new API routes.

### Access control

Admin access = `AdminRoleAssignment` rows (user → `AdminRole`, everywhere or limited to one church unit, optional expiry). A role is a list of permission keys from `src/lib/rbac/catalog.ts`; the catalog maps each key to CASL rules, so new capabilities are code changes and roles only combine them. `User.role` is **not** an authorization source, and Better Auth's admin-plugin endpoints are disabled on purpose (`admin({ roles: { user: userAc } })`). Never grant admin access from unit membership (members choose units themselves on public forms).

- Every server action / admin page / route checks a specific permission: `requirePermission(action, Subject, instance?)`. `requireAdmin()` alone only proves "some admin". `requirePermission` also enforces the admin session rules (2FA, 12h) whenever the check needs admin powers.
- Type-level checks (no instance) ignore self-only rules, but **pass for unit-limited users**: narrow lists with `scopeOf(action, subject)` and pass `{ unitIds }` (member's units) as the instance for mutations. Use `requireOrgWide` where unit-limited access must not count (exports, households, birthdays).
- Managing roles is Super Admin only (`requireSuperAdmin`). Granting/removing access: Super Admins, or holders of `access.delegate` within their unit — bounded by `delegationProblem` in `src/lib/rbac/delegation.ts` (own units only, unit-limited roles, never beyond what they hold there, not themselves, target must be a unit member). Last-Super-Admin and self-removal guards live in `src/actions/access.ts`.
- Member contact fields (email/phone/WhatsApp/address) need `members.contact` (subject `MemberContact`, unit-aware). `src/actions/members.ts` blanks them server-side (`redactContact`); keep any new member query that returns them going through it. Editing a member requires contact access (the form would otherwise wipe them).
- "View as": a Super Admin's `phanet.preview_as` cookie swaps in another user's grants in `getAbilityContext` (ignored for anyone else). Previews are read-only — `requirePermission` blocks non-read actions; call `assertNotPreviewing()` in any mutation that doesn't go through it.
- When adding an admin page, add it to `src/app/admin/_components/admin-routes.ts` (sidebar/palette filtering). Run `pnpm tsx scripts/rbac-check.ts` — it tests the policy and flags actions/pages without a permission check.

### Payments

Default currency is **GHS** (Paystack is the primary provider for Ghana).

### Finance ledger

`Income` / `Expense` rows are never deleted — void them (`voidedAt` + `voidReason`) and filter `voidedAt: null` in every total. Expenses only count as spent once `PAID`. Ledger math lives in `src/lib/finance-summary.ts` (integer pesewas); check it with `pnpm tsx scripts/finance-check.ts`. A pledge's `confirmedAmount` is synced from its linked incomes (`syncCommitment` in `src/lib/finance-ledger.ts`). Online gifts (`/give`, pledge "Pay now") become Income only via `settlePaymentIntent` (`src/lib/payments/settle.ts`), which re-verifies with the provider and is idempotent — never write Income from a webhook payload directly. Budgets store only the plan; spend is always computed (`budgetActuals`). Annual giving statements (`src/lib/statements.ts`) only include Income linked to a `Member`. Monthly gifts (`RecurringGift`, card only) are charged by `/api/cron/recurring-giving` (needs `CRON_SECRET`): it claims the month by advancing `nextChargeAt` *before* charging, then settles through `settlePaymentIntent` — keep that order to avoid double charges; schedule rules are in `src/lib/recurring.ts`.

### Chat assistant ("Elim")

The system prompt in `src/app/api/chat/route.ts` plus the knowledge base in `src/lib/knowledge-base.ts` enforce a strict topical scope (PHANET + Christian faith only) and explicit jailbreak resistance. **Do not weaken these guardrails** when editing the prompt — the refusal language is intentional.

### Styling

Tailwind v4 via `@tailwindcss/postcss` — there is no `tailwind.config`; tokens live in `src/app/globals.css`.

## Gotchas

- The Prisma output dir (`src/app/generated/prisma`) is inside `src/app`. It's gitignored but Next.js will still scan it — don't put route files near it.
- The `pnpm-workspace.yaml` exists but the repo is currently a single package; treat it as a workspace-aware install (`pnpm install` from this directory).
- `proxy.ts` (not `middleware.ts`) is the Next 16 rename — don't add a parallel `middleware.ts`.
- After editing `schema.prisma`, both `prisma generate` AND a migration are usually needed; the generated client is committed-out via `.gitignore` but type-checked from `src/app/generated/prisma`.
