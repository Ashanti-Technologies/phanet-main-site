import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/database";
import { can, requirePermission } from "@/lib/auth-guard";
import { adminSaveRegistration, adminSaveRegistrationDraft } from "@/actions/event-registrations";
import { STEP_LABEL } from "@/lib/registration-drafts";
import { formatMoney, relTime } from "@/lib/format";
import { RegistrationForm } from "@/app/components/event-registration/registration-form";
import { loadRegistrationForm } from "@/app/components/event-registration/load-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; userId: string }> };

/** Admin fills in or changes someone's registration for them (draft or booking). */
export default async function RegisterOnBehalfPage({ params }: Props) {
  await requirePermission("update", "EventRegistration");
  const { id, userId } = await params;
  const [event, user, showContact] = await Promise.all([
    prisma.event.findUnique({ where: { id }, include: { priceTiers: { orderBy: { sortOrder: "asc" } } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }),
    can("read", "MemberContact"),
  ]);
  if (!event || !user) notFound();

  const [{ registration, formProps }, draft] = await Promise.all([
    loadRegistrationForm(event, user),
    prisma.eventRegistrationDraft.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      select: { step: true, lastActiveAt: true, remindersSent: true, completedAt: true },
    }),
  ]);
  const { key, ...form } = formProps;
  const back = `/admin/content/events/${event.id}?tab=registrations`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-3">
        <Link
          href={back}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {event.title}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {registration ? "Edit booking" : "Finish registration"} for {user.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[
              showContact && user.email,
              registration
                ? `${registration.status === "PENDING_PAYMENT" ? "Awaiting payment" : "Booked"} · ${formatMoney(registration.amountPaid)} of ${formatMoney(registration.amountDue)} paid`
                : draft && !draft.completedAt
                  ? `Reached: ${STEP_LABEL[draft.step]} · active ${relTime(draft.lastActiveAt)}${draft.remindersSent ? ` · reminded ${draft.remindersSent}×` : ""}`
                  : "Not started",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <p className="rounded-xl border bg-muted p-3 text-sm">
          {registration
            ? "Changes apply to their booking when you save. Online balances aren't charged here: they'll get a pay link, or record a payment from the registrations list."
            : "Your changes are saved as you go, and they'll see them if they open their form. Nothing is booked until you complete the registration."}
        </p>
      </div>

      <RegistrationForm
        key={key}
        {...form}
        open
        registerPath={`/events/${event.slug}/register`}
        admin={{
          submit: adminSaveRegistration.bind(null, user.id),
          saveDraft: adminSaveRegistrationDraft.bind(null, user.id),
          doneHref: back,
        }}
      />
    </div>
  );
}
