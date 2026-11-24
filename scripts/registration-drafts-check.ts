// Self-check for registration drafts: funnel counts, reminder rules, cleanup.
// Needs a throwaway LOCAL database with migrations applied (refuses anything else):
//   createdb phanet_draft_test
//   DATABASE_URL=postgresql://$USER@localhost:5432/phanet_draft_test pnpm prisma migrate deploy
//   DATABASE_URL=postgresql://$USER@localhost:5432/phanet_draft_test RESEND_API_KEY= HUBTEL_CLIENT_ID= \
//     NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN= CRON_SECRET=test pnpm tsx scripts/registration-drafts-check.ts
// (Blank keys: no real emails/SMS go out, and the expected send errors aren't reported to PostHog.)
import assert from "node:assert/strict";

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("Refusing to run: DATABASE_URL must point at a local test database.");
  process.exit(1);
}

async function main() {
  const { prisma } = await import("../src/lib/database");
  const { getRegistrationProgress, sendDraftReminder } = await import("../src/lib/registration-drafts");
  const { GET } = await import("../src/app/api/cron/registration-reminders/route");
  const cron = async () =>
    (await GET(new Request("http://x", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }))).json();

  const H = 3600_000;
  const ago = (ms: number) => new Date(Date.now() - ms);
  const tag = `check-${Date.now()}`;
  const event = await prisma.event.create({
    data: {
      slug: tag,
      title: "Check Camp",
      category: "camp",
      date: new Date(Date.now() + 30 * 24 * H),
      time: "9am",
      location: "Accra",
      description: "",
      bodyHtml: "",
      status: "PUBLISHED",
      registrationEnabled: true,
    },
  });
  const user = (name: string, emailVerified: boolean) =>
    prisma.user.create({ data: { id: `${tag}-${name}`, name, email: `${name}-${tag}@example.test`, emailVerified } });
  const [a, b, c, d] = await Promise.all([user("ama", true), user("kofi", false), user("esi", true), user("yaw", true)]);
  const draft = (userId: string, data: object) => prisma.eventRegistrationDraft.create({ data: { eventId: event.id, userId, ...data } });

  try {
    await draft(a.id, { step: "PEOPLE", lastActiveAt: ago(48 * H), data: { self: { fullName: "Ama Typed", phone: "" }, rows: [{}, {}] } });
    await draft(b.id, { step: "ACCOUNT", lastActiveAt: ago(48 * H) }); // never opened the link
    await draft(c.id, { step: "REVIEW", completedAt: new Date(), remindersSent: 1 }); // booked after a reminder
    await draft(d.id, { step: "YOU", lastActiveAt: ago(1 * H), data: { rows: [] } }); // active just now

    // Funnel: everyone started; completed counts as having reached every step.
    const p = await getRegistrationProgress(event.id);
    const count = (s: string) => p.funnel.steps.find((x) => x.step === s)!.count;
    assert.equal(p.funnel.started, 4);
    assert.equal(count("YOU"), 3);
    assert.equal(count("PEOPLE"), 2);
    assert.equal(count("REVIEW"), 1);
    assert.equal(p.funnel.completed, 1);
    assert.equal(p.funnel.completedAfterReminder, 1);
    assert.equal(p.inProgress.length, 3);
    const ama = p.inProgress.find((x) => x.userId === a.id)!;
    assert.equal(ama.name, "Ama Typed"); // what they typed beats the account name
    assert.equal(ama.people, 2);

    // First run: the two idle drafts get one reminder each; recent and completed don't.
    let run = await cron();
    assert.equal(run.sent, 2);
    const sentTo = async (id: string) =>
      (await prisma.eventRegistrationDraft.findUniqueOrThrow({ where: { eventId_userId: { eventId: event.id, userId: id } } })).remindersSent;
    assert.equal(await sentTo(a.id), 1);
    assert.equal(await sentTo(b.id), 1);
    assert.equal(await sentTo(d.id), 0);

    // Straight after: A is inside the 3-day gap, B (unverified) is at its limit of 1.
    run = await cron();
    assert.equal(run.sent, 0);

    // Three days later A gets its second and last reminder; B still nothing.
    await prisma.eventRegistrationDraft.updateMany({ where: { eventId: event.id }, data: { lastRemindedAt: ago(73 * H) } });
    run = await cron();
    assert.equal(run.sent, 1);
    assert.equal(await sentTo(a.id), 2);
    await prisma.eventRegistrationDraft.updateMany({ where: { eventId: event.id }, data: { lastRemindedAt: ago(73 * H) } });
    assert.equal((await cron()).sent, 0);

    // A stale claim (someone else already sent) sends nothing.
    const dDraft = await prisma.eventRegistrationDraft.findFirstOrThrow({ where: { userId: d.id } });
    assert.equal(await sendDraftReminder(dDraft.id, 5), false);

    // After the event: no reminders, and saved answers are cleared (rows stay for stats).
    await prisma.event.update({ where: { id: event.id }, data: { date: ago(48 * H) } });
    await prisma.eventRegistrationDraft.update({ where: { id: dDraft.id }, data: { lastActiveAt: ago(48 * H) } });
    run = await cron();
    assert.equal(run.sent, 0);
    const left = await prisma.eventRegistrationDraft.findMany({ where: { eventId: event.id } });
    assert.equal(left.length, 4);
    assert.ok(left.every((r) => r.data === null));

    console.log("✓ registration draft checks passed");
  } finally {
    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.deleteMany({ where: { id: { startsWith: tag } } });
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
