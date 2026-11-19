import { cache } from "react";
import { prisma } from "@/lib/database";
import type { Event, EventCategory } from "@/lib/events";

function toPublicEvent(event: {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: Date;
  endDate: Date | null;
  time: string;
  location: string;
  address: string | null;
  description: string;
  bodyHtml: string;
  isFeatured: boolean;
  registrationUrl: string | null;
  registrationEnabled: boolean;
  imageUrl: string | null;
  imageAlt: string | null;
  headerImageUrl: string | null;
  status: "DRAFT" | "PUBLISHED";
}): Event {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    category: event.category as EventCategory,
    date: event.date.toISOString().slice(0, 10),
    endDate: event.endDate?.toISOString().slice(0, 10),
    time: event.time,
    location: event.location,
    address: event.address ?? undefined,
    description: event.description,
    body: "",
    bodyHtml: event.bodyHtml,
    isFeatured: event.isFeatured,
    registrationUrl: event.registrationEnabled
      ? `/events/${event.slug}/register`
      : (event.registrationUrl ?? undefined),
    imageUrl: event.imageUrl ?? undefined,
    imageAlt: event.imageAlt ?? undefined,
    headerImageUrl: event.headerImageUrl ?? undefined,
    status: event.status,
  };
}

export async function getAllEvents(): Promise<Event[]> {
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { date: "asc" },
  });
  return events.map(toPublicEvent);
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const event = await prisma.event.findFirst({
    where: { slug, status: "PUBLISHED" },
  });
  return event ? toPublicEvent(event) : null;
}

/** Next featured event that hasn't ended. Cached per request (layout banner + homepage share it). */
export const getFeaturedEvent = cache(async (): Promise<Event | undefined> => {
  // Event dates are UTC-midnight calendar days, so compare against today's UTC midnight.
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const event = await prisma.event.findFirst({
    where: {
      status: "PUBLISHED",
      isFeatured: true,
      OR: [{ endDate: { gte: today } }, { endDate: null, date: { gte: today } }],
    },
    orderBy: { date: "asc" },
  });
  return event ? toPublicEvent(event) : undefined;
});
