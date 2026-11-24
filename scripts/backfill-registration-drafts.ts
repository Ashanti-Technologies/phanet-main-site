// One-off: give people who signed up for an event before draft tracking existed a draft,
// so they show under "In progress" and get the normal reminders.
// "Signed up" = account created since --since (default: when the event was created) with no booking.
// Dry run by default; needs the registration_drafts migration applied before --apply.
//   pnpm tsx scripts/backfill-registration-drafts.ts hoe-2026 [--since=2026-11-01] [--apply]
const [slug] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");
const sinceArg = process.argv.find((a) => a.startsWith("--since="))?.slice(8);

async function main() {
  if (!slug) throw new Error("Usage: backfill-registration-drafts.ts <event-slug> [--since=YYYY-MM-DD] [--apply]");
  const { prisma } = await import("../src/lib/database");
  try {
    const event = await prisma.event.findUniqueOrThrow({ where: { slug }, select: { id: true, title: true, createdAt: true } });
    const since = sinceArg ? new Date(sinceArg) : event.createdAt;
    if (isNaN(since.getTime())) throw new Error("Bad --since date; use YYYY-MM-DD");

    const users = await prisma.user.findMany({
      where: {
        createdAt: { gte: since },
        // Not a booker, and not put on someone else's booking.
        OR: [
          { member: null },
          {
            member: {
              eventRegistrations: { none: { eventId: event.id } },
              eventAttendances: { none: { eventId: event.id } },
            },
          },
        ],
      },
      select: { id: true, name: true, email: true, emailVerified: true, createdAt: true, member: { select: { fullName: true } } },
      orderBy: { createdAt: "asc" },
    });

    console.log(`${event.title}: ${users.length} account(s) since ${since.toISOString().slice(0, 10)} without a booking`);
    for (const u of users) console.log(`  ${u.createdAt.toISOString().slice(0, 10)}  ${u.emailVerified ? "verified  " : "unverified"}  ${u.member?.fullName || u.name} <${u.email}>`);
    if (!apply) return console.log("Dry run. Re-run with --apply to create the drafts.");

    const { count } = await prisma.eventRegistrationDraft.createMany({
      data: users.map((u) => ({
        eventId: event.id,
        userId: u.id,
        step: u.emailVerified ? "YOU" : "ACCOUNT",
        lastActiveAt: u.createdAt,
      })),
      skipDuplicates: true,
    });
    console.log(`Created ${count} draft(s). The daily reminder job picks them up at its next run.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
