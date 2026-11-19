import { getProjects } from "@/actions/projects";
import { requirePermission } from "@/lib/auth-guard";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/admin/_components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Plus, Edit, Eye, Users } from "lucide-react";
import { Progress } from "@/app/components/ui/progress";

const fundingModeLabels = {
  SINGLE_SPONSOR: "Single sponsor",
  MULTI_CONTRIBUTOR: "Multi-contributor",
};

export default async function AdminProjectsPage() {
  await requirePermission("read", "Project");
  const projects = await getProjects({ includeCommitments: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Manage your fundraising projects
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No projects yet</p>
            <Button asChild>
              <Link href="/admin/projects/new">
                <Plus className="mr-2 h-4 w-4" />
                Create your first project
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const target = Number(project.targetAmount);
            const raised = project.amountRaised;
            const progress =
              target > 0 ? Math.min((raised / target) * 100, 100) : 0;

            return (
              <Card key={project.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-1">
                      <Link
                        href={`/admin/projects/${project.id}`}
                        className="hover:underline underline-offset-4"
                      >
                        {project.title}
                      </Link>
                    </CardTitle>
                    <StatusBadge status={project.status} />
                  </div>
                  <CardDescription>
                    {fundingModeLabels[project.fundingMode]}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-mono font-medium tabular-nums">
                        GH₵ {raised.toLocaleString()} / GH₵{" "}
                        {target.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right tabular-nums">
                      {progress.toFixed(0)}% funded
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" asChild>
                      <Link href={`/admin/projects/${project.id}`}>
                        <Edit className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/projects/${project.id}/commitments`}>
                        <Users className="mr-1.5 h-3.5 w-3.5" />
                        Commitments
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="ml-auto"
                    >
                      <Link
                        href={`/projects/${project.id}`}
                        target="_blank"
                        aria-label={`View ${project.title} on the public site`}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
