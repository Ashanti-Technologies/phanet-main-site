# PostHog Audit Report

## Summary

This audit covered both the browser and server PostHog runtimes. The integration is installed and uses a first-party ingest proxy, but four correctness problems require attention: an outdated server SDK, inconsistent cross-runtime identity, missing logout resets, and no live page or screen events observed by PostHog.

**Counts**

- **Errors**: 4 (must fix)
- **Warnings**: 3 (should fix)
- **Suggestions**: 2 (nice to have)
- **Passes**: 6

**Problematic items** _(only `error`, `warning`, `suggestion` — no passes)_

| Severity | Area | Check | File | Details |
|----------|------|-------|------|---------|
| `error` | Installation | SDK version up to date | `package.json:55` | installed posthog-js ^1.373.4 / posthog-node ^5.34.1; latest 1.454.2 / 6.0.6 (posthog-node is one major behind) |
| `error` | Identification | Same distinct_id across client and server | `src/lib/logger.ts:57` | Server exception captures omit distinct_id, so client and server events cannot reliably share the same identity. |
| `error` | Identification | reset() called on logout / account switch | `src/app/(member-portal)/me/_components/portal-user-menu.tsx:44` | Four detected sign-out flows call authClient.signOut() without posthog.reset(). |
| `error` | Live Data | No live page or screen events | — | Confirm the SDK uses the correct project token and that pageview autocapture is enabled; then load a page and verify events in Activity → Live events. |
| `warning` | Installation | Initialization is correct | `instrumentation-client.ts:5` | Client and server init are env-sourced and runtime-appropriate, but development capture is disabled and missing configuration is asserted rather than guarded. |
| `warning` | Identification | identify() called before captures / flag evals | `src/app/projects/[id]/commit/page.tsx:55` | commitment_page_viewed is captured before the asynchronous session lookup identifies the user at line 62, leaving early authenticated activity anonymous. |
| `warning` | Event Capture | Key activation events captured | `src/actions/event-registrations.ts:72` | Activation is tracked via commitment_created, but explicit signup and purchase/subscription events are missing. |
| `suggestion` | Live Data | Error alerts not wired | — | No alert is wired for: error-tracking-issue-created, error-tracking-issue-reopened, error-tracking-issue-spiking. |
| `suggestion` | Live Data | Ingestion rate limits missing | — | No ingestion rate limit set for: project, per_issue. |

## Recommended actions

1. **Installation · SDK version up to date** — `posthog-node` is one major version behind the latest release. _Why it matters:_ stale SDK behavior can change event delivery, exception capture, and supported initialization options. _Fix:_ Upgrade `posthog-node` at `package.json:55`, then run the project build. See [Node.js SDK docs](https://posthog.com/docs/libraries/node).
2. **Identification · Same distinct_id across client and server** — Server exception captures omit the authenticated user's `distinct_id`. _Why it matters:_ split identities inflate person counts and make funnels, retention, and cross-runtime debugging unreliable. _Fix:_ Pass the same stable authenticated user ID into server captures at `src/lib/logger.ts:57`. See [identifying users](https://posthog.com/docs/product-analytics/identify).
3. **Identification · reset() called on logout / account switch** — Four sign-out flows do not reset browser PostHog state. _Why it matters:_ a subsequent user on the same device can be merged into the previous person's history. _Fix:_ Call `posthog.reset()` in every successful sign-out flow, starting at `src/app/(member-portal)/me/_components/portal-user-menu.tsx:44`. See [identifying users](https://posthog.com/docs/product-analytics/identify).
4. **Live Data · No live page or screen events** — PostHog observed no `$pageview` or `$screen` events in the last 30 days. _Why it matters:_ web analytics, acquisition reporting, replays, and page-based funnels cannot represent real traffic. _Fix:_ Confirm the deployed token, initialization path, proxy routes, and pageview autocapture, then verify a real visit in Live events. See [Web analytics installation](https://posthog.com/docs/web-analytics/installation).
5. **Installation · Initialization is correct** — Development capture is disabled and missing configuration is asserted instead of handled safely. _Why it matters:_ local integration failures stay hidden while a missing production value can silently lose events or fail unpredictably. _Fix:_ Replace the environment-mode disablement and non-null assertion with the framework's guarded missing-config behavior at `instrumentation-client.ts:5`. See [Next.js installation](https://posthog.com/docs/libraries/next-js).
6. **Identification · identify() called before captures / flag evals** — `commitment_page_viewed` fires before asynchronous identification completes. _Why it matters:_ early authenticated activity remains anonymous, fragmenting funnels and user journeys. _Fix:_ Identify the authenticated user before capturing the page event at `src/app/projects/[id]/commit/page.tsx:55`. See [identifying users](https://posthog.com/docs/product-analytics/identify).
7. **Event Capture · Key activation events captured** — Signup and purchase/subscription flows lack explicit business events. _Why it matters:_ growth funnels and conversion reporting cannot reliably measure acquisition through monetization. _Fix:_ Add static, snake_case events at the relevant signup and checkout success boundaries, beginning from `src/actions/event-registrations.ts:72`. See [capturing events](https://posthog.com/docs/product-analytics/capture-events).
8. **Live Data · Error alerts not wired** — No issue-created, issue-reopened, or issue-spiking alert is configured. _Why it matters:_ production regressions can remain undiscovered even when PostHog records them correctly. _Fix:_ Configure the required notifications in Error tracking → Alerts. See [error tracking alerts](https://posthog.com/docs/error-tracking/alerts).
9. **Live Data · Ingestion rate limits missing** — Project and per-issue error ingestion limits are unset. _Why it matters:_ runaway exceptions can increase ingestion volume and obscure higher-value failures. _Fix:_ Set project and per-issue limits in Error tracking → Settings. See [error tracking](https://posthog.com/docs/error-tracking).

## Full audit

### Installation

Whether the PostHog SDK is present, current, and initialized the way the framework expects. Everything downstream depends on this: a missing or stale SDK silently changes which events exist and which config options are honoured.

| Check | Status | File | Details |
|-------|--------|------|---------|
| PostHog SDK installed | `pass` | `package.json:55` | posthog-js@^1.373.4 and posthog-node@^5.34.1 |
| SDK version up to date | `error` | `package.json:55` | installed posthog-js ^1.373.4 / posthog-node ^5.34.1; latest 1.454.2 / 6.0.6 (posthog-node is one major behind) |
| Initialization is correct | `warning` | `instrumentation-client.ts:5` | Client and server init are env-sourced and runtime-appropriate, but development capture is disabled and missing configuration is asserted rather than guarded; development should surface a clear missing-variable error while production remains a no-op. |
| One initialization per runtime | `pass` | `instrumentation-client.ts:6` | Exactly one browser init and one server init; no runtime has duplicate initialization. |

#### Assumptions and blind spots

The manifest and known initialization sites were checked, but deployment-specific environment injection and built output were not. Static code cannot prove that the deployed runtime receives the configured variables or that both proxy asset routes work. The no-live-events finding could also reflect an inactive deployment or delayed health-check recomputation. Verify a real production page load and server capture in PostHog Live events after upgrading the SDK.

### Identification

Whether the same human maps to one stable `distinct_id` across sessions, runtimes, and logins. Identity defects are the most expensive kind to fix after the fact, because they corrupt person counts, funnels, and retention retroactively rather than going forward.

| Check | Status | File | Details |
|-------|--------|------|---------|
| Stable distinct_id (not session UUID) | `pass` | `src/actions/commitments.ts:107` | Both identify calls use stable authenticated user IDs (session.user.id and user.id). |
| identify() called before captures / flag evals | `warning` | `src/app/projects/[id]/commit/page.tsx:55` | commitment_page_viewed is captured before the asynchronous session lookup identifies the user at line 62, leaving early authenticated activity anonymous. |
| Same distinct_id across client and server | `error` | `src/lib/logger.ts:57` | Server exception captures omit distinct_id, so client and server events cannot reliably share the same identity. |
| reset() called on logout / account switch | `error` | `src/app/(member-portal)/me/_components/portal-user-menu.tsx:44` | Four detected sign-out flows call authClient.signOut() without posthog.reset(). |

#### Assumptions and blind spots

The audit followed static identify, capture, and logout call sites, but did not execute authentication flows. It cannot prove whether framework session hydration identifies users elsewhere at runtime or whether every server exception has an authenticated user available. Alternative sign-out paths may exist behind dynamically generated UI or third-party callbacks. Verify person profiles after login, refresh, server-side errors, logout, and a second account login on the same device.

### Event Capture

Whether events are named consistently, reach PostHog reliably, and cover the moments the business actually reasons about. Gaps here don't break anything visibly; they just leave the questions you want to ask unanswerable.

| Check | Status | File | Details |
|-------|--------|------|---------|
| Event names are static and consistent | `pass` | `src/actions/commitments.ts:93` | All 16 capture calls use static event names; no template literals or dynamic event-name variables were found. |
| Captures route through a reverse proxy | `pass` | `instrumentation-client.ts:7` | Browser capture uses the first-party same-origin /ingest reverse proxy. |
| Key activation events captured | `warning` | `src/actions/event-registrations.ts:72` | Activation is tracked via commitment_created, but explicit signup and purchase/subscription events are missing. |

#### Assumptions and blind spots

Static scans covered explicit PostHog capture calls and likely signup, activation, and billing surfaces, but not events emitted by external services or generated code. A configured `/ingest` path does not prove the deployed rewrite handles both event and asset routes. Autocapture may provide interaction data, but it is not a substitute for the missing business events. Verify the expected signup, activation, checkout, and subscription events and properties in Live events using real test flows.

### Live Data

What PostHog itself has already flagged for this project, read from its recommendations and health checks. These come from ingested data rather than source code, so they catch problems no static scan can see — stack frames that never resolve, syncs that keep failing, alerts nobody wired up.

| Check | Status | File | Details |
|-------|--------|------|---------|
| Open findings in PostHog | `pass` | — | 3 open findings from PostHog |
| No live page or screen events | `error` | — | Confirm the SDK uses the correct project token and that pageview autocapture is enabled; then load a page and verify events in Activity → Live events. |
| Error alerts not wired | `suggestion` | — | No alert is wired for: error-tracking-issue-created, error-tracking-issue-reopened, error-tracking-issue-spiking. Set them up in Error tracking → Alerts. |
| Ingestion rate limits missing | `suggestion` | — | No ingestion rate limit set for: project, per_issue. Set them in Error tracking → Settings. |

#### Assumptions and blind spots

These findings reflect what PostHog has observed in the recent lookback window, so a project that has just started sending data, or one whose findings haven't been recomputed yet, can show a clean area without being clean. Recommendation status was accepted as computed by PostHog and not re-derived. The no-live-events issue may reflect low traffic as well as a delivery defect. Verify a current page load in Live events and wait for health checks to recompute after fixes.

### Write report

Whether the audit's local markdown deliverable was created from the complete ledger.

| Check | Status | File | Details |
|-------|--------|------|---------|
| Create posthog-audit-report.md | `pending` | — | Report creation was in progress when the ledger snapshot was rendered. |

#### Assumptions and blind spots

This workflow row reflects the ledger snapshot used to build the report and is resolved immediately after the file exists.

### Upload notebook

Whether the local report was mirrored into a shareable PostHog notebook.

| Check | Status | File | Details |
|-------|--------|------|---------|
| Write the report into a PostHog notebook | `pending` | — | Notebook upload had not started when the ledger snapshot was rendered. |

#### Assumptions and blind spots

This workflow row reflects the pre-upload ledger state; notebook completeness is verified separately after every section is appended.

## About this audit

The PostHog wizard runs this audit in stages: SDK installation → init correctness → identification → event capture → live data → this report. The early stages resolve checks against the project's source tree. The live-data stage reads what PostHog already computed from your ingested data — things no source scan can see, like whether stack frames actually resolve. Every result, pass or otherwise, is recorded in the ledger this report was generated from.

- `error` items break correctness now (events lost, identity broken). Fix first.
- `warning` items work today but cause subtle data-quality bugs. Fix when convenient.
- `suggestion` items are best-practice improvements with measurable upside.

Re-run `posthog-wizard audit` after applying fixes to refresh the ledger.

## Run handoff

- **Changes made:** Completed a read-only source and live-data audit; no application source or configuration was changed. A verified mirror was created in the [PostHog audit notebook](https://us.posthog.com/project/425611/notebooks/tAXbIU2e).
- **Files modified or created:** Created `posthog-audit-report.md` only. The transient `.posthog-audit-checks.json` ledger was removed after all checks resolved.
- **Manual next steps:** Address the four errors first, then the three warnings and two suggestions in **Recommended actions**. Deploy the fixes, load a real production page, confirm `$pageview` and server events in Live events, and re-run the audit.
