import Link from "next/link";
import { listMembers } from "@/actions/members";
import { getChurchUnits } from "@/actions/church-units";
import { listTags } from "@/actions/tags";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Plus, Upload } from "lucide-react";
import { MembersFilters } from "./_components/members-filters";
import { MembersTable } from "./_components/members-table";
import { MembersPagination } from "./_components/members-pagination";

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filter = {
    q: first(sp.q),
    unitId: first(sp.unitId),
    tagId: first(sp.tagId),
    status: first(sp.status) as never,
    ageBucket: first(sp.ageBucket) as never,
    page: first(sp.page) ?? "1",
    pageSize: first(sp.pageSize) ?? "25",
  };

  const [data, units, tags] = await Promise.all([
    listMembers(filter),
    getChurchUnits(true),
    listTags(),
  ]);

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
        </CardHeader>
        <CardContent className="space-y-4">
          <MembersFilters units={units} tags={tags} />
          <MembersTable items={data.items} />
          <MembersPagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
