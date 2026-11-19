-- CreateTable
CREATE TABLE "admin_role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_role_assignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "unitId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_role_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_role_name_key" ON "admin_role"("name");

-- CreateIndex
CREATE INDEX "admin_role_assignment_userId_idx" ON "admin_role_assignment"("userId");

-- CreateIndex
CREATE INDEX "admin_role_assignment_roleId_idx" ON "admin_role_assignment"("roleId");

-- CreateIndex
CREATE INDEX "admin_role_assignment_unitId_idx" ON "admin_role_assignment"("unitId");

-- AddForeignKey
ALTER TABLE "admin_role_assignment" ADD CONSTRAINT "admin_role_assignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_assignment" ADD CONSTRAINT "admin_role_assignment_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_assignment" ADD CONSTRAINT "admin_role_assignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "admin_role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_assignment" ADD CONSTRAINT "admin_role_assignment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "church_unit_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed roles (ids are stable so code/tests can refer to them).
INSERT INTO "admin_role" ("id", "name", "description", "permissions", "isSystem", "updatedAt") VALUES
  ('role_super_admin', 'Super Admin', 'Everything, including managing admin access. Keep this to two or three people.', ARRAY['*'], true, now()),
  ('role_pastor', 'Pastor', 'Members, pastoral care, prayer, services and messaging. Can view finances and reports.', ARRAY['members.view','members.edit','members.delete','members.import','members.export','care.view','care.edit','care.pastoral','prayer.view','prayer.manage','services.view','services.checkin','services.manage','messages.view','messages.edit','messages.send','finance.view','reports.view','reports.export','events.view','settings.tags'], false, now()),
  ('role_content_editor', 'Content Editor', 'Website content: events, pages, sermons and the homepage.', ARRAY['content.view','content.edit','events.view'], false, now()),
  ('role_finance', 'Finance Officer', 'Income, expenses, budgets, funds, projects and pledges.', ARRAY['finance.view','finance.edit','finance.approve','finance.export'], false, now()),
  ('role_unit_leader', 'Unit Leader', 'View and care for members. Assign it to a unit to limit it to that unit''s members.', ARRAY['members.view','members.edit','care.view','care.edit'], false, now()),
  ('role_protocol', 'Protocol', 'Event registrations, check-in and service attendance.', ARRAY['events.view','events.manage','services.view','services.checkin'], false, now()),
  ('role_data', 'Data & Reports', 'Reports and exports, plus read-only access to the member directory.', ARRAY['reports.view','reports.export','members.view'], false, now()),
  ('role_prayer', 'Prayer Team', 'Read and follow up on prayer requests.', ARRAY['prayer.view','prayer.manage'], false, now());

-- Carry over the old comma-separated User.role keys.
INSERT INTO "admin_role_assignment" ("id", "userId", "roleId", "unitId")
SELECT 'mig_' || md5(u."id" || r.role_id), u."id", r.role_id, NULL
FROM "user" u
CROSS JOIN LATERAL unnest(string_to_array(lower(replace(u."role", ' ', '')), ',')) AS k(key)
JOIN (VALUES ('admin', 'role_super_admin'), ('super_admin', 'role_super_admin'), ('pastor', 'role_pastor'),
             ('editor', 'role_content_editor'), ('finance', 'role_finance')) AS r(key, role_id) ON r.key = k.key
ON CONFLICT DO NOTHING;

-- Unit leaders keep their units, now as unit-scoped assignments.
INSERT INTO "admin_role_assignment" ("id", "userId", "roleId", "unitId")
SELECT 'mig_' || md5(uur."userId" || uur."unitId"), uur."userId", 'role_unit_leader', uur."unitId"
FROM "user_unit_role" uur
JOIN "user" u ON u."id" = uur."userId"
WHERE u."role" ILIKE '%unit_leader%'
ON CONFLICT DO NOTHING;
