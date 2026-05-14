import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ProfileForm } from "./_components/profile-form";

export default async function MemberProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ claimed?: string }>;
}) {
  const { member } = await getCurrentMemberOrRedirect();
  const params = (await searchParams) ?? {};
  const justClaimed = params.claimed === "1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Keep your contact details current.
        </p>
      </div>
      {justClaimed ? (
        <div className="rounded-md border border-mikado-yellow/40 bg-mikado-yellow/10 p-4 text-sm">
          <p className="font-medium">Welcome to your PHANET portal</p>
          <p className="mt-1 text-muted-foreground">
            Please review the details below and update anything that&apos;s
            missing or out of date.
          </p>
        </div>
      ) : null}
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
