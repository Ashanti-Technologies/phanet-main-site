import { requirePermission } from "@/lib/auth-guard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { TemplateForm } from "../_components/template-form";

export default async function NewTemplatePage() {
  await requirePermission("create", "MessageTemplate");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New template</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Template details</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm
            initial={{ name: "", channel: "EMAIL", subject: "", body: "" }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
