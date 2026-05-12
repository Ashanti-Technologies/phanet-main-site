import { prisma } from "@/lib/database";
import { MembershipApplicationForm } from "./_components/application-form";

export const metadata = {
  title: "Apply for Membership | PHANET",
  description: "Apply to become part of the Phanerosis Prayer Network.",
};

export const dynamic = "force-dynamic";

export default async function MembershipApplyPage() {
  const units = await prisma.churchUnitOption.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <main className="bg-background py-16 my-16 text-foreground">
      <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Membership
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Apply to join PHANET
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Share your contact details and a short introduction. Once your
            application is reviewed, a PHANET leader can approve your profile
            and send your member portal invite.
          </p>
        </div>
        <div className="rounded-md border bg-card p-6 shadow-sm">
          <MembershipApplicationForm units={units} />
        </div>
      </div>
    </main>
  );
}
