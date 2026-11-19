import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listEventForms } from "@/actions/cms";
import { Button } from "@/app/components/ui/button";
import { EventForm } from "../_components/event-form";

export default async function NewEventPage() {
  const otherForms = await listEventForms();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/content/events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">New event</h1>
          <p className="text-sm text-muted-foreground">Create a CMS event.</p>
        </div>
      </div>
      <EventForm otherForms={otherForms} />
    </div>
  );
}
