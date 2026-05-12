import { listTemplates } from "@/actions/messages";
import { getChurchUnits } from "@/actions/church-units";
import { listTags } from "@/actions/tags";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ComposeForm } from "./_components/compose-form";

export default async function ComposePage() {
  const [templates, units, tags] = await Promise.all([
    listTemplates(),
    getChurchUnits(true),
    listTags(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compose</h1>
        <p className="text-sm text-muted-foreground">
          Pick a channel, target a segment, preview the substituted body, then
          send.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New message</CardTitle>
        </CardHeader>
        <CardContent>
          <ComposeForm
            templates={templates}
            units={units}
            tags={tags.map((t) => ({ id: t.id, label: t.label }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
