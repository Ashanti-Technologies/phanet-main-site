import Link from "next/link";
import { listHouseholds } from "@/actions/households";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { HouseholdsList } from "./_components/households-list";

export default async function HouseholdsPage() {
  const households = await listHouseholds();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Households</h1>
          <p className="text-sm text-muted-foreground">
            Group related members for pastoral care and communications.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/members/households/new">New household</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All households</CardTitle>
        </CardHeader>
        <CardContent>
          <HouseholdsList
            initial={households.map((h) => ({
              id: h.id,
              name: h.name,
              memberCount: h.members.length,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
