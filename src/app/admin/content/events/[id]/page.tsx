import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminEventById } from "@/actions/cms";
import { Button } from "@/app/components/ui/button";
import { EventForm } from "../_components/event-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const event = await getAdminEventById(id);
  if (!event) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/content/events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Event</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>
      </div>
      <EventForm event={event} />
    </div>
  );
}
