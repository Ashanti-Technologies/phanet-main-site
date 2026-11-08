import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { listServices } from "@/actions/attendance";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ServicesTable } from "./_components/services-table";

export default async function ServicesPage() {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const services = (await listServices()).map((s) => ({
    ...s,
    when: s.date.getTime() > now ? ("upcoming" as const) : ("past" as const),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
          <p className="text-sm text-muted-foreground">
            Track attendance for Sunday services, midweek gatherings, and
            special events.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/services/new">
            <CalendarPlus className="h-4 w-4 mr-1.5" /> New service
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All services</CardTitle>
        </CardHeader>
        <CardContent>
          <ServicesTable services={services} />
        </CardContent>
      </Card>
    </div>
  );
}
