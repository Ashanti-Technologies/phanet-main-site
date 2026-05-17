<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the PHANET website. The setup covers client-side initialization via `instrumentation-client.ts` (Next.js 15.3+ pattern), a reverse proxy through `next.config.ts` rewrites, a server-side PostHog client in `src/lib/posthog-server.ts`, and 13 tracked events spanning the full fundraising funnel, chat assistant engagement, hero CTA performance, events discovery, and user authentication. Users are identified on both client and server to ensure cross-domain correlation of events.

## Events instrumented

| Event | Description | File |
|---|---|---|
| `hero_cta_clicked` | User clicks a primary or secondary CTA in the hero slider | `src/app/(main-site)/_components/Hero.tsx` |
| `get_involved_clicked` | User clicks "Get Involved Today" in the home page section | `src/app/(main-site)/_components/GetInvolved.tsx` |
| `google_login_initiated` | User clicks "Continue with Google" to authenticate | `src/app/components/auth/google-login-button.tsx` |
| `chat_opened` | User opens the Elim chat assistant widget | `src/app/components/chat/ChatWidget.tsx` |
| `chat_message_sent` | User sends a message in the Elim chat | `src/app/components/chat/ChatWidget.tsx` |
| `prayer_request_submitted` | Prayer request captured via chat widget or API (client + server) | `src/app/components/chat/ChatWidget.tsx`, `src/app/api/prayer-request/route.ts` |
| `projects_list_viewed` | User views the fundraising projects listing page (server-side) — top of funnel | `src/app/projects/page.tsx` |
| `project_viewed` | User views a fundraising project detail page (server-side) | `src/app/projects/[id]/page.tsx` |
| `commitment_page_viewed` | User lands on the commitment form | `src/app/projects/[id]/commit/page.tsx` |
| `commitment_submitted` | User submits the commitment form (client-side) | `src/app/projects/[id]/commit/page.tsx` |
| `commitment_created` | Commitment successfully persisted in the database (server-side) | `src/actions/commitments.ts` |
| `event_card_clicked` | User clicks an event card (regular or featured) in the events listing | `src/app/(main-site)/events/_components/EventsClient.tsx` |
| `events_category_filtered` | User filters events by category | `src/app/(main-site)/events/_components/EventsClient.tsx` |

## Infrastructure

| File | Change |
|---|---|
| `instrumentation-client.ts` | Client-side PostHog initialization (Next.js 15.3+ pattern) |
| `src/lib/posthog-server.ts` | Singleton server-side PostHog client (`posthog-node`) |
| `next.config.ts` | `/ingest/*` reverse proxy rewrites + `skipTrailingSlashRedirect` |
| `.env` | `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1592398)
- [Commitment Funnel](/insights/DwQXd5RE) — 4-step conversion: Projects List → Project Detail → Commitment Form → Submitted
- [Commitments Submitted Over Time](/insights/pVIEWSkS) — daily trend of server-confirmed commitments and unique users
- [Prayer Requests Submitted](/insights/OnBn7IJK) — prayer requests captured via the Elim chat assistant
- [Elim Chat Engagement](/insights/jnokDjdf) — chat opens vs messages sent, measuring engagement depth
- [Hero CTA Clicks by Type](/insights/S1aQFBzM) — primary vs secondary CTA clicks broken down by type

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
