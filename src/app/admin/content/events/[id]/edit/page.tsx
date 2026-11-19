import Link from "next/link";
import { notFound } from "next/navigation";
import { AnimateIcon } from "@animate-ui/react/icons";
import { getAdminEventById, listEventForms, listFeeFunds } from "@/actions/cms";
import { ArrowLeft } from "@/app/components/animate-ui/icons/arrow-left";
import { Button } from "@/app/components/ui/button";
import { EventForm } from "../../_components/event-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const [event, otherForms, funds] = await Promise.all([
    getAdminEventById(id),
    listEventForms(id),
    listFeeFunds(),
  ]);
  if (!event) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <AnimateIcon animateOnHover animation="pointing" asChild>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/content/events/${event.id}`} aria-label="Back to event">
              <ArrowLeft />
            </Link>
          </Button>
        </AnimateIcon>
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold tracking-tight">Edit {event.title ?? 'Event'}</h1>
          {/* <p className="truncate text-muted-foreground">{event.title}</p> */}
        </div>
      </div>
      <EventForm event={event} otherForms={otherForms} funds={funds} />
    </div>
  );
}
