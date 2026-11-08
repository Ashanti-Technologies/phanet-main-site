import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import { NotificationsForm } from "./_components/notifications-form";

export default async function MemberNotificationsPage() {
  const { member } = await getCurrentMemberOrRedirect();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-3xl font-medium tracking-tight">
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose how PHANET keeps in touch with you.
        </p>
      </div>
      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        <NotificationsForm
          notifyByEmail={member.notifyByEmail}
          notifyBySms={member.notifyBySms}
        />
      </div>
    </div>
  );
}
