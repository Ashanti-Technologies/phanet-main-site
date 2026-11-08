import { getProjectById } from "@/actions/projects";
import { getCommitmentsByProject } from "@/actions/commitments";
import { requireAdmin } from "@/lib/auth-guard";
import { notFound } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ExportButton } from "./_components/export-button";
import { CommitmentsTable } from "./_components/commitments-table";
import {
  parseTableQuery,
  type TableSearchParams,
} from "@/app/components/data-table/search-params";
import { serializePrisma } from "@/lib/serializers/serializePrisma";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<TableSearchParams>;
}

export default async function CommitmentsPage({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const query = parseTableQuery(await searchParams, ["status"]);
  const { commitments, pagination } = await getCommitmentsByProject(id, {
    search: query.q,
    status: query.filters.status,
    sort: query.sort,
    page: query.page,
    limit: query.pageSize,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Commitments</h1>
          <p className="text-muted-foreground">{project.title}</p>
        </div>
        <ExportButton projectId={id} projectTitle={project.title} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Commitments ({pagination.total})</CardTitle>
          <CardDescription>
            Manage and review all commitments for this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommitmentsTable
            commitments={serializePrisma(commitments)}
            total={pagination.total}
          />
        </CardContent>
      </Card>
    </div>
  );
}
