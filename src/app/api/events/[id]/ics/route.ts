import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";

function toIcsDateUTC(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
      date.getUTCDate(),
    )}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(
      date.getUTCSeconds(),
    )}Z`
  );
}

function escapeIcs(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      location: true,
      date: true,
      endDate: true,
    },
  });
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const start = event.date;
  const end = event.endDate ?? new Date(start.getTime() + 60 * 60_000);
  const uid = `${event.id}@phanerosisnetwork.com`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PHANET//Member Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDateUTC(new Date())}`,
    `DTSTART:${toIcsDateUTC(start)}`,
    `DTEND:${toIcsDateUTC(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description || "")}`,
    `LOCATION:${escapeIcs(event.location || "")}`,
    `URL:https://phanerosisnetwork.com/events/${event.slug}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
    },
  });
}
