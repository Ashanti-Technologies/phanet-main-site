import Link from "next/link";
import { listTemplates } from "@/actions/messages";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { TemplatesTable } from "../_components/message-tables";

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable bodies for bulk email and SMS. Use{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              {"{{firstName}}"}
            </code>{" "}
            and similar variables for per-recipient substitution.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/messages/templates/new">New template</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All templates</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplatesTable templates={templates} />
        </CardContent>
      </Card>
    </div>
  );
}
