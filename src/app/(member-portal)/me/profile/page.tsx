import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ProfileForm } from "./_components/profile-form";

export default async function MemberProfilePage() {
  const { member } = await getCurrentMemberOrRedirect();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Keep your contact details current.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Editable details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm member={member} />
        </CardContent>
      </Card>
    </div>
  );
}
