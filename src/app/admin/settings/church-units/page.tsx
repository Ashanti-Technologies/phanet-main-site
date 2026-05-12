import { getChurchUnits } from "@/actions/church-units";
import { requireAdmin } from "@/lib/auth-guard";
import { ChurchUnitsList } from "./_components/church-units-list";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ChurchUnitsSettingsPage() {
  await requireAdmin();
  const churchUnits = await getChurchUnits(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Church Units</h1>
          <p className="text-muted-foreground">
            Manage ministry family options for the commitment form
          </p>
        </div>
      </div>

      <ChurchUnitsList initialUnits={churchUnits} />
    </div>
  );
}
