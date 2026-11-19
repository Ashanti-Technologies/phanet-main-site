import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/database";
import { getEventAttendeeRows } from "@/lib/event-registration";
import { chargesFees } from "@/lib/event-fees";
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
  await requirePermission("export", "EventRegistration");
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { slug: true, registrationFields: true, paymentMode: true },
  });
  if (!event) notFound();

  const fields = parseRegistrationFields(event.registrationFields);
  const rows = await getEventAttendeeRows(id);
  const fees = chargesFees(event.paymentMode);

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
      Attending: r.attendance,
      Country: r.country,
      Region: r.region,
      City: r.city,
      "Member status": r.memberStatus,
      Room: r.room,
      "Checked in": r.checkedIn ? "Yes" : "No",
      // Booking-level money repeats on each person of the booking.
      ...(fees
        ? {
            "Price": r.tierName,
            "Amount": r.amount?.toFixed(2) ?? "",
            "Booking total": r.payment.amountDue.toFixed(2),
            "Booking paid": r.payment.amountPaid.toFixed(2),
            "Payment status": r.payment.state,
          }
        : {}),
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
