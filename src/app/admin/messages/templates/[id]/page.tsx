import { notFound } from "next/navigation";
import { getTemplate } from "@/actions/messages";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { TemplateForm } from "../_components/template-form";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tpl = await getTemplate(id);
  if (!tpl) notFound();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tpl.name}</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template details</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm
            initial={{
              id: tpl.id,
              name: tpl.name,
              channel: tpl.channel,
              subject: tpl.subject ?? "",
              body: tpl.body,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
