import { requirePermission } from "@/lib/auth-guard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ImportWizard } from "./_components/import-wizard";

export default async function ImportPage() {
  await requirePermission("import", "Member");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Import members</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV, map columns, preview duplicates, then commit. Existing
          members matched by email or phone are skipped.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV import</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportWizard />
        </CardContent>
      </Card>
    </div>
  );
}
