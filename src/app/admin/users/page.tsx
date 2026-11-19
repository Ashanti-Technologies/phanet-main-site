import { getAccessOverview } from "@/actions/access";
import { AccessManager } from "./_components/access-manager";

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [data, { tab }] = await Promise.all([getAccessOverview(), searchParams]);
  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin access</h1>
        <p className="text-sm text-muted-foreground">
          {data.mode === "super"
            ? "Give people a role — everywhere, or limited to one church unit. A role is a set of permissions you choose."
            : "Give unit roles to members of your unit. You can only give roles within your own access."}
        </p>
      </div>
      <AccessManager
        tab={tab === "roles" ? "roles" : "people"}
        mode={data.mode}
        grantable={data.grantable}
        me={data.me}
        units={data.units}
        roles={data.roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          permissions: r.permissions,
          isSystem: r.isSystem,
          assignmentCount: r._count.assignments,
        }))}
        assignments={data.assignments.map((a) => ({
          id: a.id,
          roleId: a.roleId,
          unitId: a.unitId,
          expiresAt: a.expiresAt?.toISOString() ?? null,
          expired: !!a.expiresAt && a.expiresAt <= now,
          createdAt: a.createdAt.toISOString(),
          grantedBy: a.grantedBy?.name ?? null,
          canRevoke: a.canRevoke,
          user: a.user,
        }))}
      />
    </div>
  );
}
