import Link from "next/link";
import { listMembers } from "@/actions/members";
import { getHouseholdById } from "@/actions/households";
import { getChurchUnits } from "@/actions/church-units";
import { listTags } from "@/actions/tags";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Plus, Upload, X } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { MembersTable } from "./_components/members-table";
import {
  parseTableQuery,
  type TableSearchParams,
} from "@/app/components/data-table/search-params";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<TableSearchParams>;
}) {
  const sp = await searchParams;
  const householdId = typeof sp.householdId === "string" ? sp.householdId : "";
  const query = parseTableQuery(sp, [
    "status",
    "units",
    "tags",
    "age",
  ]);
  const filter = {
    q: query.q,
    householdId: householdId || undefined,
    ...query.filters,
    sort: query.sort,
    page: query.page,
    pageSize: query.pageSize,
  };

  const [data, units, tags, household] = await Promise.all([
    listMembers(filter),
    getChurchUnits(true),
    listTags(),
    householdId ? getHouseholdById(householdId) : null,
  ]);

  // Same URL minus the household scope (set by the household page's link).
  const withoutHousehold = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      k === "householdId" || typeof v !== "string" ? [] : [[k, v]],
    ),
  ).toString();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
          <p className="text-sm text-muted-foreground">
            {data.total.toLocaleString()} member{data.total === 1 ? "" : "s"} in
            the directory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/members/import">
              <Upload className="h-4 w-4 mr-1.5" /> Import
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/members/new">
              <Plus className="h-4 w-4 mr-1.5" /> New member
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Directory</CardTitle>
          {householdId && (
            <Badge variant="secondary" className="w-fit gap-1.5">
              Household: {household?.name ?? "Unknown"}
              <Link
                href={`/admin/members${withoutHousehold ? `?${withoutHousehold}` : ""}`}
                aria-label="Show all households"
              >
                <X className="h-3 w-3" />
              </Link>
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <MembersTable
            items={data.items}
            total={data.total}
            units={units}
            tags={tags}
          />
        </CardContent>
      </Card>
    </div>
  );
}
