import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { NotificationsForm } from "./_components/notifications-form";

export default async function MemberNotificationsPage() {
  const { member } = await getCurrentMemberOrRedirect();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Choose how PHANET should contact you.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationsForm
            notifyByEmail={member.notifyByEmail}
            notifyBySms={member.notifyBySms}
          />
        </CardContent>
      </Card>
    </div>
  );
}
