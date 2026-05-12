import { getChurchUnits } from "@/actions/church-units";
import { listTags } from "@/actions/tags";
import { listHouseholds } from "@/actions/households";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { MemberForm, emptyMemberValues } from "../_components/member-form";

export default async function NewMemberPage() {
  const [units, tags, households] = await Promise.all([
    getChurchUnits(true),
    listTags(),
    listHouseholds(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New member</h1>
        <p className="text-sm text-muted-foreground">
          Add someone to the directory.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <MemberForm
            initial={emptyMemberValues}
            units={units}
            tags={tags.map((t) => ({ id: t.id, label: t.label }))}
            households={households.map((h) => ({ id: h.id, name: h.name }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
