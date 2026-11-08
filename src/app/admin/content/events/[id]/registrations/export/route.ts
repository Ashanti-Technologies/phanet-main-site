import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/database";
import { getEventAttendeeRows } from "@/lib/event-registration";
import { toCsv } from "@/lib/reports";
import { parseRegistrationFields } from "@/lib/schemas/event-registration.schema";

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
  const answer = (v: string | boolean | undefined) =>
    v === undefined ? "" : v === true ? "Yes" : v === false ? "No" : v;

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
      Food: r.food,
      Allergies: r.allergies,
      "Arrival date": r.arrivalDate,
      "Arrival time": r.arrivalTime,
      Travel: r.travel,
      "Coming from": r.origin,
      Room: r.room,
      "Checked in": r.checkedIn ? "Yes" : "No",
      "Stay in touch": r.contactConsent ? "Yes" : "No",
      Notes: r.notes,
      ...Object.fromEntries(
        fields.map((f) => [
          f.label,
          answer(f.scope === "person" ? r.personAnswers[f.id] : r.bookingAnswers[f.id]),
        ]),
      ),
    })),
  );

  return new Response(csv || "No registrations yet\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${event.slug}-registrations.csv"`,
    },
  });
}
