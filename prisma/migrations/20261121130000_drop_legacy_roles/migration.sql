-- Content editors see events through content.view; attendee details stay
-- with registration roles (matches the old editor role). Idempotent.
UPDATE admin_role SET permissions = array_remove(permissions, 'events.view') WHERE id = 'role_content_editor';

-- Apply AFTER the admin-roles code is deployed: older code still reads these.

-- User.role is no longer an authorization source. Reset it so Better Auth's
-- admin plugin (which trusts role = "admin") grants nothing.
UPDATE "user" SET "role" = CASE WHEN "role" ILIKE '%member%' THEN 'member' ELSE 'user' END
WHERE "role" IS NOT NULL AND "role" NOT IN ('user', 'member');

-- DropForeignKey
ALTER TABLE "user_unit_role" DROP CONSTRAINT "user_unit_role_unitId_fkey";

-- DropForeignKey
ALTER TABLE "user_unit_role" DROP CONSTRAINT "user_unit_role_userId_fkey";

-- DropTable
DROP TABLE "user_unit_role";

