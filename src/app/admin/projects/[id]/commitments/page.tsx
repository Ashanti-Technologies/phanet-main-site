import { getProjectById } from "@/actions/projects";
import { getCommitmentsByProject } from "@/actions/commitments";
import { requireAdmin } from "@/lib/auth-guard";
import { notFound } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ExportButton } from "./_components/export-button";
import { CommitmentFinanceForm } from "./_components/commitment-finance-form";

interface Props {
  params: Promise<{ id: string }>;
}

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function CommitmentsPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  const { commitments, pagination } = await getCommitmentsByProject(id);

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
          {commitments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No commitments yet for this project
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Church Unit</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Finance</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commitments.map((commitment) => (
                    <TableRow key={commitment.id}>
                      <TableCell className="font-medium">
                        {commitment.fullName}
                        {commitment.isAnonymous && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Anonymous)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{commitment.email}</TableCell>
                      <TableCell>{commitment.country}</TableCell>
                      <TableCell>{commitment.churchUnit || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        GH₵{" "}
                        {Number(commitment.amountCommitted).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[commitment.status]}>
                          {commitment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <CommitmentFinanceForm commitment={commitment} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(commitment.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
