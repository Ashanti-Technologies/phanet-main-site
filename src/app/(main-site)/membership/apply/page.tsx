import { prisma } from "@/lib/database";
import Link from "next/link";
import { MembershipApplicationForm } from "./_components/application-form";
import { SuccessScreen } from "@/app/components/success-celebration";
import { Button } from "@/app/components/ui/button";

export const metadata = {
  title: "Apply for Membership | PHANET",
  description: "Apply to become part of the Phanerosis Prayer Network.",
};

export const dynamic = "force-dynamic";

export default async function MembershipApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  if ((await searchParams).submitted) {
    return (
      <main className="bg-background pt-20 text-foreground sm:pt-28">
        <div className="mx-auto w-full max-w-2xl px-4">
          <SuccessScreen
            title="Application received!"
            actions={
              <Button asChild size="lg" className="h-12 w-full">
                <Link href="/">Back home</Link>
              </Button>
            }
          >
            <p>A PHANET leader will review it and follow up with your signup invite.</p>
          </SuccessScreen>
        </div>
      </main>
    );
  }

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
