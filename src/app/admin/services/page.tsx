import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { listServices } from "@/actions/attendance";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
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

export default async function ServicesPage() {
  const services = await listServices();
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No services yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  services.map((s) => {
                    const upcoming = s.date.getTime() > now;
                    return (
                      <TableRow key={s.id} className="hover:bg-muted/40">
                        <TableCell>
                          <Link
                            href={`/admin/services/${s.id}/check-in`}
                            className="text-sm font-medium hover:underline"
                          >
                            {s.title}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {s.date.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          <Badge
                            variant="outline"
                            className={
                              upcoming
                                ? "ml-2 text-blue-600 border-blue-500/30"
                                : "ml-2 text-muted-foreground"
                            }
                          >
                            {upcoming ? "Upcoming" : "Past"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.location ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {s._count.attendance}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/services/${s.id}/check-in`}>
                              Check in
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
