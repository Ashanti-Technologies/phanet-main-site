import { notFound } from "next/navigation";
import { getMemberById } from "@/actions/members";
import { getChurchUnits } from "@/actions/church-units";
import { listTags } from "@/actions/tags";
import { listHouseholds } from "@/actions/households";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  MemberForm,
  emptyMemberValues,
  type MemberFormValues,
} from "../../_components/member-form";

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [member, units, tags, households] = await Promise.all([
    getMemberById(id),
    getChurchUnits(true),
    listTags(),
    listHouseholds(),
  ]);
  if (!member) notFound();

  const initial: MemberFormValues = {
    ...emptyMemberValues,
    id: member.id,
    fullName: member.fullName,
    preferredName: member.preferredName ?? "",
    dob: toDateInput(member.dob),
    gender: (member.gender ?? "") as MemberFormValues["gender"],
    maritalStatus: (member.maritalStatus ?? "") as MemberFormValues["maritalStatus"],
    email: member.email ?? "",
    phone: member.phone ?? "",
    whatsapp: member.whatsapp ?? "",
    addressLine: member.addressLine ?? "",
    city: member.city ?? "",
    region: member.region ?? "",
    country: member.country ?? "Ghana",
    occupation: member.occupation ?? "",
    photoUrl: member.photoUrl ?? "",
    photoPublicId: member.photoPublicId ?? "",
    salvationDate: toDateInput(member.salvationDate),
    baptismDate: toDateInput(member.baptismDate),
    weddingAnniversary: toDateInput(member.weddingAnniversary),
    joinDate: toDateInput(member.joinDate),
    status: member.status,
    notes: member.notes ?? "",
    notifyByEmail: member.notifyByEmail,
    notifyBySms: member.notifyBySms,
    householdId: member.householdId ?? "",
    unitIds: member.units.map((u) => u.unitId),
    tagIds: member.tags.map((t) => t.tagId),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit {member.fullName}
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberForm
            initial={initial}
            units={units}
            tags={tags.map((t) => ({ id: t.id, label: t.label }))}
            households={households.map((h) => ({ id: h.id, name: h.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
