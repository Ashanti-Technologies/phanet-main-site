import { getAdminUsers } from "@/actions/admin-users";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { UsersTable } from "./_components/users-table";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Promote or demote admin access for authenticated users.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
