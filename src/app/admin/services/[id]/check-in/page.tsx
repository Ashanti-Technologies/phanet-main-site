import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit } from "lucide-react";
import { getService, getAttendanceForService } from "@/actions/attendance";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { CheckInBoard } from "./_components/check-in-board";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [service, present] = await Promise.all([
    getService(id),
    getAttendanceForService(id),
  ]);
  if (!service) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {service.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {service.date.toLocaleString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {service.location ? ` · ${service.location}` : ""}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/services/${service.id}/edit`}>
            <Edit className="h-4 w-4 mr-1.5" /> Edit service
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check in</CardTitle>
        </CardHeader>
        <CardContent>
          <CheckInBoard
            serviceId={service.id}
            initialPresent={present.map((a) => ({
              id: a.id,
              memberId: a.member.id,
              fullName: a.member.fullName,
              preferredName: a.member.preferredName,
              photoUrl: a.member.photoUrl,
              checkedInAt: a.checkedInAt.toISOString(),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
