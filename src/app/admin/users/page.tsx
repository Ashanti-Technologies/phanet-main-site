import { getAdminUsers } from "@/actions/admin-users";
import { getChurchUnits } from "@/actions/church-units";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { UsersTable } from "./_components/users-table";

export default async function AdminUsersPage() {
  const [users, units] = await Promise.all([
    getAdminUsers(),
    getChurchUnits(true),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin access</h1>
        <p className="text-sm text-muted-foreground">
          Assign admin roles to staff. Members live in the Members directory and
          do not appear here unless they hold an admin role.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users with login access</CardTitle>
          <CardDescription>
            Pick one or more roles per user. Unit leaders also need at least one
            church unit assigned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} units={units} />
        </CardContent>
      </Card>
    </div>
  );
}
