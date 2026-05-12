# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Next.js 16 marketing + fundraising site for **Phanerosis Prayer Network International (PHANET)**. Uses the App Router, React 19, Tailwind v4, Prisma 7 on Postgres, and Better Auth.

Package manager is **pnpm** (there is a `pnpm-workspace.yaml` and `pnpm-lock.yaml` — do not switch to npm/yarn).

## Common commands

```bash
pnpm dev              # next dev
pnpm build            # next build
pnpm start            # next start
pnpm lint             # eslint .
pnpm db:seed          # tsx prisma/seed.ts — seed Church Units, etc.

pnpm exec prisma migrate dev --name <name>   # create + apply a migration in dev
pnpm exec prisma generate                    # regenerate Prisma client (runs automatically postinstall)
pnpm exec prisma studio                      # open DB GUI
```

No test runner is configured.

The Prisma client is generated into `src/app/generated/prisma` (note: inside `src/app`, not `node_modules`). Import it from `@/app/generated/prisma/client` — never edit files under that directory by hand. After changing `prisma/schema.prisma`, run `prisma generate` or rely on the `postinstall` hook.

## Environment

Required env vars (see `.env`): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GROQ_API_KEY`, `YOUTUBE_API_KEY`.

`src/constants.ts` switches `siteUrl` based on `NODE_ENV`.

## Architecture

### Routing layout (App Router)

- `src/app/(main-site)/` — public marketing site (Hero, About, MissionValues, Events, Messages, etc.). Components live in `_components/` colocated with the route group.
- `src/app/projects/` — fundraising projects (list, detail, commit flow, thank-you). Served on the `projects.` subdomain via the proxy below.
- `src/app/admin/` — admin dashboard for managing projects, church units, proof uploads. Gated by `requireAdmin()` from `src/lib/auth-guard.ts`.
- `src/app/auth/`, `src/app/unauthorized/`, `src/app/not-found.tsx` — auth screens and error pages.
- `src/app/api/`:
  - `auth/[...all]/` — Better Auth handler
  - `chat/route.ts` — Edge runtime, Groq `llama-3.3-70b-versatile`, system prompt enforces hard topical guardrails (PHANET + Christian faith only)
  - `messages/route.ts` — paginated YouTube messages feed (uses `YOUTUBE_API_KEY` via `src/lib/youtube.ts`)
  - `prayer-request/route.ts` — persists prayer requests captured by the chat widget
  - `og/route.tsx` — `@vercel/og` social image
- `src/app/components/` — shared components (`ui/` is shadcn, `chat/ChatWidget.tsx` is the Elim assistant, `providers/ReactQueryProvider.tsx` wraps the tree).

### Subdomain proxy

`src/proxy.ts` is a Next.js 16 **proxy** (the renamed middleware). It rewrites `projects.phanerosisnetwork.com` (and `projects.localhost`) to the `/projects` path tree. When adding new top-level routes, remember they're invisible on the `projects.` host unless rewritten. API routes, `_next`, and any path with a dot are skipped.

### Auth

`src/lib/auth.ts` configures Better Auth with the Prisma adapter, Google OAuth, email/password, phone-number OTP (stub), and the admin plugin. Server-side, use:

- `getServerAuthSession()` — returns session or null
- `requireAuth(redirectTo?)` — redirects to `/auth/login` if unauthenticated
- `requireAdmin()` — redirects to `/admin/login` or `/unauthorized`

Client-side use `src/lib/auth-client.ts`. The admin plugin stores `role` on `User`; admin gates check `session.user.role === "admin"`.

### Database & serialization

`src/lib/database.ts` exports a singleton `prisma` client that uses the `@prisma/adapter-pg` driver adapter. Decimal/Date values from Prisma do not serialize cleanly to client components — use `src/lib/serializers/serializePrisma.ts` when passing fundraising models (Project, Commitment, PaymentIntent) from server to client.

Domain models live in `prisma/schema.prisma`:

- **Auth**: `User`, `Session`, `Account`, `Verification`
- **Fundraising**: `Project` (with `FundingMode` SINGLE_SPONSOR | MULTI_CONTRIBUTOR, `ProjectStatus`), `ProjectImage`, `Commitment` (PENDING | CONFIRMED | CANCELLED), `PaymentIntent` (STRIPE | PAYSTACK, status flow PENDING → PROCESSING → COMPLETED/FAILED/REFUNDED), `ProofUpload`, `ChurchUnitOption`
- **Other**: `PrayerRequest`

### Server actions

`src/actions/` (re-exported from `src/actions/index.ts`) — server actions for projects, commitments, church units, proof uploads, images. Validation schemas live in `src/lib/schemas/` (Zod v4). Prefer extending these over adding new API routes for mutations triggered from React components.

### Payments

`src/lib/payments/` is provider-agnostic. `getPaymentService("STRIPE" | "PAYSTACK")` returns a `PaymentService` implementing the interface in `types.ts`. Default currency is **GHS** (Paystack is the primary provider for Ghana). Use `generatePaymentReference()` for unique refs.

### Chat assistant ("Elim")

The system prompt in `src/app/api/chat/route.ts` plus the knowledge base in `src/lib/knowledge-base.ts` enforce a strict topical scope (PHANET + Christian faith only) and explicit jailbreak resistance. **Do not weaken these guardrails** when editing the prompt — the refusal language is intentional. When the assistant collects a prayer request, it posts to `/api/prayer-request` which persists to the `PrayerRequest` table.

### Styling

Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config`; tokens live in `src/app/globals.css`). shadcn is configured (`components.json`, style `new-york`, base color `neutral`, alias `@/app/components`). The animate-ui registry is also wired up. Icon library is `lucide-react`. Fonts: `DM_Sans` via `next/font/google`, applied globally in `src/app/layout.tsx`.

### Path aliases

`@/*` → `src/*` (see `tsconfig.json`). shadcn aliases route `@/components` → `@/app/components`, `@/lib` → `@/lib`, `@/ui` → `@/app/components/ui`.

### External services

- **Cloudinary** for image uploads (`next-cloudinary`) — used by `ProjectImage` and `ProofUpload`.
- **Resend** for transactional email (`src/lib/email.ts`).
- **YouTube Data API** for the messages feed (`src/lib/youtube.ts`, key `YOUTUBE_API_KEY`).
- **Groq** for chat completions (Edge runtime).
- **Vercel Analytics + Speed Insights** + **GTM** (`GTM-WNPLHGTG`) wired in `src/app/layout.tsx`.

## Gotchas

- The Prisma output dir (`src/app/generated/prisma`) is inside `src/app`. It's gitignored but Next.js will still scan it — don't put route files near it.
- The `pnpm-workspace.yaml` exists but the repo is currently a single package; treat it as a workspace-aware install (`pnpm install` from this directory).
- `proxy.ts` (not `middleware.ts`) is the Next 16 rename — don't add a parallel `middleware.ts`.
- After editing `schema.prisma`, both `prisma generate` AND a migration are usually needed; the generated client is committed-out via `.gitignore` but type-checked from `src/app/generated/prisma`.
