import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/database";
import { getEventAttendeeRows } from "@/lib/event-registration";
import { toCsv } from "@/lib/reports";
import {
  answerText,
  fieldAnswer,
  parseRegistrationFields,
} from "@/lib/schemas/event-registration.schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requirePermission("export", "Member");
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { slug: true, registrationFields: true },
  });
  if (!event) notFound();

  const fields = parseRegistrationFields(event.registrationFields);
  const rows = await getEventAttendeeRows(id);

  const csv = toCsv(
    rows.map((r) => ({
      Name: r.name,
      Relationship: r.relationship,
      "Booked by": r.bookedBy,
      "Booked by contact": r.bookedByContact,
      Phone: r.phone,
      Email: r.email,
      Gender: r.gender,
      "Age group": r.ageGroup,
      "Member status": r.memberStatus,
      Room: r.room,
      "Checked in": r.checkedIn ? "Yes" : "No",
      ...Object.fromEntries(fields.map((f) => [f.label, answerText(fieldAnswer(r, f))])),
    })),
  );

  return new Response(csv || "No registrations yet\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug}-registrations.csv"`,
    },
  });
}
