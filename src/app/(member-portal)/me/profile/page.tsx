import { Bell, CheckCircle2, UserCircle2 } from "lucide-react";
import { prisma } from "@/lib/database";
import {
  computeProfileCompleteness,
  getCurrentMemberOrRedirect,
} from "@/lib/member-portal";
import { Progress } from "@/app/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { ProfileForm } from "./_components/profile-form";
import { MemberAvatarUploader } from "./_components/member-avatar-uploader";
import { AdminViewCard } from "./_components/admin-view-card";
import { NotificationsForm } from "../notifications/_components/notifications-form";

export default async function MemberProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ claimed?: string; tab?: string }>;
}) {
  const { member } = await getCurrentMemberOrRedirect();
  const params = (await searchParams) ?? {};
  const justClaimed = params.claimed === "1";
  const needsConfirmation = !member.phanetProfile?.formSubmittedAt;
  const tab = params.tab === "notifications" ? "notifications" : "details";
  const completeness = computeProfileCompleteness(member);

  const [countries, regions] = await Promise.all([
    prisma.country.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.region.findMany({
      where: { isActive: true },
      select: { id: true, name: true, countryId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {needsConfirmation ? "Review your details" : "Your profile"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {needsConfirmation
            ? "Update anything that's missing or out of date, then confirm at the bottom."
            : "Keep your contact details and PHANET profile current."}
        </p>
      </div>

      {(justClaimed || needsConfirmation) && tab === "details" ? (
        <div className="rounded-lg border border-mikado-yellow/50 bg-mikado-yellow/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-mikado-yellow/30 p-1.5">
              <CheckCircle2 className="h-4 w-4 text-midnight-green" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-midnight-green">
                Welcome to your PHANET portal
              </p>
              <p className="text-sm text-muted-foreground">
                You&apos;re signed in. Take a moment to review your details and
                tap <strong>Confirm my details</strong> at the bottom.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Profile completeness</p>
            <p className="text-xs text-muted-foreground">
              {completeness.filled} of {completeness.total} fields complete
            </p>
          </div>
          <p className="text-2xl font-semibold tracking-tight text-midnight-green">
            {completeness.percent}%
          </p>
        </div>
        <Progress
          value={completeness.percent}
          className="mt-3 h-2 [&>div]:bg-mikado-yellow"
        />
      </div>

      <Tabs defaultValue={tab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex">
          <TabsTrigger value="details" className="gap-2">
            <UserCircle2 className="h-4 w-4" />
            Your details
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <MemberAvatarUploader
            name={member.preferredName || member.fullName}
            photoUrl={member.photoUrl}
          />

          <ProfileForm
            member={{
              preferredName: member.preferredName,
              occupation: member.occupation,
              dob: member.dob ? member.dob.toISOString().slice(0, 10) : null,
              gender: member.gender,
              maritalStatus: member.maritalStatus,
              phone: member.phone,
              whatsapp: member.whatsapp,
              addressLine: member.addressLine,
              city: member.city,
              countryId: member.countryId,
              regionId: member.regionId,
              region: member.region,
              country: member.country,
              emergencyContactName:
                member.phanetProfile?.emergencyContactName ?? null,
              emergencyContactPhone:
                member.phanetProfile?.emergencyContactPhone ?? null,
              lifeStage: member.phanetProfile?.lifeStage ?? null,
              regionalChapter: member.phanetProfile?.regionalChapter ?? null,
              professionalTrack:
                member.phanetProfile?.professionalTrack ?? null,
              organizationName:
                member.phanetProfile?.organizationName ?? null,
            }}
            countries={countries}
            regions={regions}
            needsConfirmation={needsConfirmation}
          />

          <AdminViewCard
            member={{
              status: member.status,
              joinDate: member.joinDate,
              salvationDate: member.salvationDate,
              baptismDate: member.baptismDate,
              weddingAnniversary: member.weddingAnniversary,
              household: member.household,
              units: member.units,
            }}
          />
        </TabsContent>

        <TabsContent value="notifications">
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <NotificationsForm
              notifyByEmail={member.notifyByEmail}
              notifyBySms={member.notifyBySms}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
