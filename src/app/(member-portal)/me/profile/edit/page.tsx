import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentMemberOrRedirect } from "@/lib/member-portal";
import { ProfileForm } from "../_components/profile-form";
import { MemberAvatarUploader } from "../_components/member-avatar-uploader";

export default async function EditMemberProfilePage() {
  const { member } = await getCurrentMemberOrRedirect();
  const needsConfirmation = !member.phanetProfile?.formSubmittedAt;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/me/profile"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
        <h1 className="font-serif text-3xl font-medium tracking-tight">
          {needsConfirmation ? "Review your details" : "Edit profile"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {needsConfirmation
            ? "Update anything that's missing or out of date, then confirm at the bottom."
            : "Keep your contact details and PHANET profile current."}
        </p>
      </div>

      <MemberAvatarUploader
        name={member.preferredName || member.fullName}
        photoUrl={member.photoUrl}
      />

      <ProfileForm
        member={{
          preferredName: member.preferredName,
          occupation: member.occupation,
          bio: member.bio,
          dob: member.dob ? member.dob.toISOString().slice(0, 10) : null,
          gender: member.gender,
          maritalStatus: member.maritalStatus,
          phone: member.phone,
          whatsapp: member.whatsapp,
          addressLine: member.addressLine,
          city: member.city,
          cityId: member.cityId,
          countryId: member.countryId,
          regionId: member.regionId,
          region: member.regionRef?.name ?? member.region,
          country: member.countryRef?.name ?? member.country,
          emergencyContactName:
            member.phanetProfile?.emergencyContactName ?? null,
          emergencyContactPhone:
            member.phanetProfile?.emergencyContactPhone ?? null,
          lifeStage: member.phanetProfile?.lifeStage ?? null,
          regionalChapter: member.phanetProfile?.regionalChapter ?? null,
          professionalTrack: member.phanetProfile?.professionalTrack ?? null,
          organizationName: member.phanetProfile?.organizationName ?? null,
        }}
        needsConfirmation={needsConfirmation}
      />
    </div>
  );
}
