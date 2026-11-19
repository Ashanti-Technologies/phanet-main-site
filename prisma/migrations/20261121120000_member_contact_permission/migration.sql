-- Contact details became their own permission (members.contact). Roles that
-- work with people keep them; Data & Reports (aggregate work) does not.
UPDATE "admin_role"
SET "permissions" = array_append("permissions", 'members.contact'), "updatedAt" = now()
WHERE "id" IN ('role_pastor', 'role_unit_leader')
  AND NOT ('members.contact' = ANY ("permissions"));
