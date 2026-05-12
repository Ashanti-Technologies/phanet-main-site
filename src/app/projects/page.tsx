import { getProjects } from "@/actions/projects";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/app/components/ui/card";
import { Users, Target, ArrowRight } from "lucide-react";
import Image from "next/image";

export const dynamic = "force-dynamic";

const fundingModeLabels = {
  SINGLE_SPONSOR: "Looking for Sponsor",
  MULTI_CONTRIBUTOR: "Open for Contributions",
};

const fundingModeColors = {
  SINGLE_SPONSOR: "bg-purple-100 text-purple-800",
  MULTI_CONTRIBUTOR: "bg-blue-100 text-blue-800",
};

export default async function ProjectsListingPage() {
  const projects = await getProjects({
    status: "ACTIVE",
    includeCommitments: true,
  });

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
          Support Our{" "}
          <span className="text-mikado-yellow">Kingdom Projects</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Partner with us to advance the Gospel through strategic initiatives.
          Every contribution makes a difference in raising one billion
          intercessors worldwide.
        </p>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16">
          <Target className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold">No Active Projects</h2>
          <p className="mt-2 text-muted-foreground">
            Check back soon for new fundraising opportunities.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const target = Number(project.targetAmount);
            const raised = project.amountRaised;
            const progress =
              target > 0 ? Math.min((raised / target) * 100, 100) : 0;
            const firstImage = project.images[0];

            return (
              <Card
                key={project.id}
                className="group overflow-hidden transition-all hover:shadow-lg"
              >
                {/* Image */}
                <div className="relative aspect-video overflow-hidden bg-muted">
                  {firstImage ? (
                    <Image
                      src={firstImage.url}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Target className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <Badge
                    className={`absolute top-3 right-3 ${
                      fundingModeColors[project.fundingMode]
                    }`}
                  >
                    {fundingModeLabels[project.fundingMode]}
                  </Badge>
                </div>

                <CardHeader className="pb-2">
                  <h3 className="text-xl font-semibold line-clamp-2">
                    {project.title}
                  </h3>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-cerulean">
                        GH₵ {raised.toLocaleString()} raised
                      </span>
                      <span className="text-muted-foreground">
                        of GH₵ {target.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progress.toFixed(0)}% funded</span>
                      {project.commitments && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {project.commitments.length} supporters
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  <Button className="w-full" asChild>
                    <Link href={`/projects/${project.id}`}>
                      View Project
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
