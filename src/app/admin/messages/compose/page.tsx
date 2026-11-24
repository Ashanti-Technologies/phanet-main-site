import { requirePermission } from "@/lib/auth-guard";
import { listTemplates } from "@/actions/messages";
import { getChurchUnits } from "@/actions/church-units";
import { listTags } from "@/actions/tags";
import { ComposeForm } from "./_components/compose-form";

export default async function ComposePage() {
  await requirePermission("send", "Message");
  const [templates, units, tags] = await Promise.all([
    listTemplates(),
    getChurchUnits(true),
    listTags(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Compose</h1>
        <p className="text-sm text-muted-foreground">
          Write your message, choose who gets it, check the recipients, then send.
        </p>
      </div>
      <ComposeForm
        templates={templates}
        units={units}
        tags={tags.map((t) => ({ id: t.id, label: t.label }))}
      />
    </div>
  );
}
