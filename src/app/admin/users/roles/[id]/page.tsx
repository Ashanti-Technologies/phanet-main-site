import { notFound } from "next/navigation";
import { getAdminRole } from "@/actions/access";
import { requireSuperAdmin } from "@/lib/auth-guard";
import { RoleEditor } from "../../_components/role-editor";

export default async function AdminRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSuperAdmin();
  const role = id === "new" ? null : await getAdminRole(id);
  if (id !== "new" && (!role || role.isSystem)) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{role ? `Edit ${role.name}` : "New role"}</h1>
        <p className="text-sm text-muted-foreground">
          Pick what this role can do in each area. Changes apply to everyone with the role on their next page load.
        </p>
      </div>
      <RoleEditor
        role={
          role && {
            id: role.id,
            name: role.name,
            description: role.description ?? "",
            permissions: role.permissions,
            people: role.assignments.length,
            unitLimited: role.assignments.filter((a) => a.unitId).length,
          }
        }
      />
    </div>
  );
}
