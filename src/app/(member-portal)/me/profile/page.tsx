import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/database";
import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import { ProfileForm } from "./_components/profile-form";

export default async function MemberProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ claimed?: string }>;
}) {
  const { member } = await getCurrentMemberOrRedirect();
  const params = (await searchParams) ?? {};
  const justClaimed = params.claimed === "1";
  const needsConfirmation = !member.phanetProfile?.formSubmittedAt;
  const showWelcome = justClaimed || needsConfirmation;

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {needsConfirmation ? "Review your details" : "Profile"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {needsConfirmation
            ? "Please review and confirm everything below — this is what we use to keep in touch about gatherings, prayer, and pastoral care."
            : "Keep your contact details current."}
        </p>
      </div>

      {showWelcome && needsConfirmation ? (
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
                You&apos;re signed in. Take a moment to update anything that&apos;s
                missing or out of date, then tap{" "}
                <strong>Confirm my details</strong> at the bottom.
              </p>
            </div>
          </div>
        </div>
      ) : null}

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
          professionalTrack: member.phanetProfile?.professionalTrack ?? null,
          organizationName: member.phanetProfile?.organizationName ?? null,
        }}
        countries={countries}
        regions={regions}
        needsConfirmation={needsConfirmation}
      />
    </div>
  );
}
