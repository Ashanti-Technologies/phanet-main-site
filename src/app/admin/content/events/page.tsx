import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminEvents } from "@/actions/cms";
import { can } from "@/lib/auth-guard";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
} from "@/app/components/ui/card";
import { EventsTable } from "./_components/events-table";

export default async function AdminEventsPage() {
  const [events, canCreate] = await Promise.all([getAdminEvents(), can("create", "Event")]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Manage public ministry gatherings and registrations.
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/admin/content/events/new">
              <Plus className="mr-2 h-4 w-4" />
              New event
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent>
          <EventsTable events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
