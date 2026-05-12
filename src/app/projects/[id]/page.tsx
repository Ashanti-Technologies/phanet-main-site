import { getProjectById } from "@/actions/projects";
import { getThankYouWallData } from "@/actions/commitments";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Progress } from "@/app/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/app/components/ui/carousel";
import {
  Heart,
  Users,
  Target,
  MapPin,
  ChevronRight,
  ImageIcon,
  CheckCircle,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

const fundingModeLabels = {
  SINGLE_SPONSOR: "Looking for Sponsor",
  MULTI_CONTRIBUTOR: "Open for Contributions",
};

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project || project.status !== "ACTIVE") {
    notFound();
  }

  const thankYouData = await getThankYouWallData(id);

  const target = Number(project.targetAmount);
  const raised = project.amountRaised;
  const progress = target > 0 ? Math.min((raised / target) * 100, 100) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image Gallery */}
          <div className="overflow-hidden rounded-xl bg-muted">
            {project.images.length > 0 ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {project.images.map((image, index) => (
                    <CarouselItem key={image.id}>
                      <div className="relative aspect-video">
                        <Image
                          src={image.url}
                          alt={`${project.title} - Image ${index + 1}`}
                          fill
                          className="object-cover"
                          priority={index === 0}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {project.images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </>
                )}
              </Carousel>
            ) : (
              <div className="flex aspect-video items-center justify-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Title & Badge */}
          <div>
            <Badge variant="secondary" className="mb-3">
              {fundingModeLabels[project.fundingMode]}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {project.title}
            </h1>
          </div>

          {/* Description */}
          <div className="prose prose-lg max-w-none">
            <p className="text-muted-foreground whitespace-pre-wrap">
              {project.description}
            </p>
          </div>

          {/* Proof of Work */}
          {project.proofUploads.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Progress Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {project.proofUploads.map((proof) => (
                    <div key={proof.id} className="space-y-2">
                      <div className="relative aspect-video overflow-hidden rounded-lg">
                        <Image
                          src={proof.imageUrl}
                          alt="Progress update"
                          fill
                          className="object-cover"
                        />
                      </div>
                      {proof.note && (
                        <p className="text-sm text-muted-foreground">
                          {proof.note}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(proof.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Supporters */}
          {thankYouData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Our Supporters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {thankYouData.slice(0, 6).map((supporter) => (
                    <div
                      key={supporter.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mikado-yellow/20 text-mikado-yellow font-semibold">
                        {supporter.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {supporter.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {supporter.country}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {thankYouData.length > 6 && (
                  <Button variant="link" className="mt-4" asChild>
                    <Link href="/projects/thank-you">
                      View all supporters
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Sticky */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card className="overflow-hidden">
              <CardContent className="p-6 space-y-6">
                {/* Progress */}
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold text-cerulean">
                      GH₵ {raised.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      of GH₵ {target.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">
                      {progress.toFixed(0)}% funded
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {project.commitments.length} supporters
                    </span>
                  </div>
                </div>

                {/* CTA */}
                <Button size="lg" className="w-full text-lg h-14" asChild>
                  <Link href={`/projects/${project.id}/commit`}>
                    <Heart className="mr-2 h-5 w-5" />
                    Make a Commitment
                  </Link>
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  You&apos;ll sign in with Google to complete your commitment
                </p>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-6 w-6 mx-auto text-mikado-yellow" />
                  <p className="mt-2 text-2xl font-bold">
                    GH₵ {target.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Goal</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto text-cerulean" />
                  <p className="mt-2 text-2xl font-bold">
                    {project.commitments.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Supporters</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
