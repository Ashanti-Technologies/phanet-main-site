// Self-check for member merging and duplicate detection.
// Needs a throwaway LOCAL database with migrations applied (refuses anything else):
//   createdb phanet_merge_test
//   DATABASE_URL=postgresql://$USER@localhost:5432/phanet_merge_test pnpm prisma migrate deploy
//   DATABASE_URL=postgresql://$USER@localhost:5432/phanet_merge_test NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN= \
//     pnpm tsx scripts/member-merge-check.ts
import assert from "node:assert/strict";

const url = process.env.DATABASE_URL ?? "";
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("Refusing to run: DATABASE_URL must point at a local test database.");
  process.exit(1);
}

async function main() {
  const { prisma } = await import("../src/lib/database");
  const { mergeMembers, findLikelyDuplicates } = await import("../src/lib/member-merge");
  const tag = `merge-${Date.now()}`;
  const user = (n: string) => prisma.user.create({ data: { id: `${tag}-${n}`, name: n, email: `${n}-${tag}@example.test`, emailVerified: true } });
  const [admin, u1, u2] = await Promise.all([user("admin"), user("u1"), user("u2")]);
  const [unitA, unitB] = await Promise.all(["A", "B"].map((n) => prisma.churchUnitOption.create({ data: { name: `${tag}-${n}` } })));
  const [s1, s2] = await Promise.all(["s1", "s2"].map((t) => prisma.service.create({ data: { title: `${tag}-${t}`, date: new Date() } })));
  const event = (n: string) =>
    prisma.event.create({
      data: { slug: `${tag}-${n}`, title: `Camp ${n}`, category: "camp", date: new Date(), time: "9am", location: "Accra", description: "", bodyHtml: "" },
    });
  const [e1, e2] = await Promise.all([event("1"), event("2")]);
  const book = async (memberId: string, eventId: string) => {
    const reg = await prisma.eventRegistration.create({ data: { eventId, registrantId: memberId } });
    await prisma.eventAttendee.create({ data: { registrationId: reg.id, eventId, memberId, relationship: "SELF" } });
  };

  try {
    // Shadrach's shape: new signed-up record (keep) + old imported one with only a phone (drop).
    const keep = await prisma.member.create({
      data: { fullName: `Kofi Mensah ${tag}`, status: "VISITOR", userId: u1.id, email: `kofi-${tag}@example.test`, phone: "+233 24 412 3456", units: { create: { unitId: unitA.id } } },
    });
    const drop = await prisma.member.create({
      data: {
        fullName: `kofi  mensah ${tag}`, status: "PENDING_APPROVAL", phone: "0244123456", occupation: "Teacher", notes: "Imported 2024", notifyBySms: false,
        units: { create: [{ unitId: unitA.id, role: "LEADER" }, { unitId: unitB.id }] },
        attendance: { create: [{ serviceId: s1.id }, { serviceId: s2.id }] },
        notesList: { create: { authorId: admin.id, body: "Called" } },
        phanetProfile: { create: { organizationName: "GES" } },
      },
    });
    await prisma.attendance.create({ data: { memberId: keep.id, serviceId: s1.id } });
    await book(drop.id, e1.id);

    // Detection: same phone in two formats, and the same name with odd spacing/case.
    const dupes = await findLikelyDuplicates(keep.id);
    assert.deepEqual(dupes, [{ id: drop.id, reasons: ["same phone", "same name"] }]);

    const res = await mergeMembers(keep.id, drop.id);
    assert.deepEqual(res, { ok: true, keptId: keep.id, droppedName: drop.fullName });
    assert.equal(await prisma.member.count({ where: { id: drop.id } }), 0);
    const kept = await prisma.member.findUniqueOrThrow({
      where: { id: keep.id },
      include: { units: true, attendance: true, notesList: true, phanetProfile: true, eventRegistrations: true, eventAttendances: true },
    });
    assert.equal(kept.phone, "+233 24 412 3456"); // own value wins
    assert.equal(kept.occupation, "Teacher"); // blank filled
    assert.equal(kept.status, "PENDING_APPROVAL"); // further along than VISITOR
    assert.equal(kept.notes, "Imported 2024");
    assert.equal(kept.notifyBySms, false); // opt-out respected
    assert.equal(kept.userId, u1.id);
    assert.deepEqual(kept.units.map((u) => [u.unitId, u.role]).sort(), [[unitA.id, "MEMBER"], [unitB.id, "MEMBER"]].sort());
    assert.equal(kept.attendance.length, 2); // s1 not doubled, s2 moved
    assert.equal(kept.notesList.length, 1);
    assert.equal(kept.phanetProfile?.organizationName, "GES");
    assert.equal(kept.eventRegistrations.length, 1);
    assert.equal(kept.eventAttendances.length, 1);

    // The sign-in moves over when only the duplicate has one.
    const a = await prisma.member.create({ data: { fullName: `A ${tag}` } });
    const b = await prisma.member.create({ data: { fullName: `B ${tag}`, userId: u2.id } });
    assert.equal((await mergeMembers(a.id, b.id)).ok, true);
    assert.equal((await prisma.member.findUniqueOrThrow({ where: { id: a.id } })).userId, u2.id);

    // Refusals leave both records untouched.
    const c = await prisma.member.create({ data: { fullName: `C ${tag}` } });
    await book(c.id, e1.id);
    const r1 = await mergeMembers(keep.id, c.id);
    assert.equal(r1.ok, false);
    assert.match(!r1.ok ? r1.error : "", /Both are booked for Camp 1/);
    assert.equal((await mergeMembers(keep.id, a.id)).ok, false); // both have sign-ins
    assert.equal((await mergeMembers(c.id, c.id)).ok, false);
    assert.equal(await prisma.member.count({ where: { id: { in: [keep.id, a.id, c.id] } } }), 3);
    // Bookings for different events merge fine.
    const d = await prisma.member.create({ data: { fullName: `D ${tag}` } });
    await book(d.id, e2.id);
    assert.equal((await mergeMembers(keep.id, d.id)).ok, true);
    assert.equal(await prisma.eventRegistration.count({ where: { registrantId: keep.id } }), 2);
    console.log("✓ member merge checks passed");
  } finally {
    await prisma.member.deleteMany({ where: { fullName: { contains: tag } } });
    await prisma.event.deleteMany({ where: { slug: { startsWith: tag } } });
    await prisma.service.deleteMany({ where: { title: { startsWith: tag } } });
    await prisma.churchUnitOption.deleteMany({ where: { name: { startsWith: tag } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: tag } } });
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
