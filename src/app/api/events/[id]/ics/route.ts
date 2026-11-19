import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { buildEventIcs } from "@/lib/event-calendar";

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
      address: true,
      date: true,
      endDate: true,
      time: true,
      calendarReminders: true,
    },
  });
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(buildEventIcs(event), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
    },
  });
}
