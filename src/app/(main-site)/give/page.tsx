import Link from "next/link";
import { prisma } from "@/lib/database";
import { getSessionOrNull } from "@/lib/auth-guard";
import { PROJECTS_FUND_ID } from "@/lib/finance-ledger";
import { GiveForm } from "./_components/give-form";

export const metadata = {
  title: "Give | Phanerosis Prayer Network",
  description:
    "Support the work of the Phanerosis Prayer Network International with your tithe, offering or a special gift — by Mobile Money, card or bank.",
};

// Reads the session to prefill the form.
export const dynamic = "force-dynamic";

export default async function GivePage() {
  const [funds, session] = await Promise.all([
    prisma.fund.findMany({
      // Project gifts go through a pledge on the projects site instead.
      where: { isActive: true, id: { not: PROJECTS_FUND_ID } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getSessionOrNull(),
  ]);
  const member = session?.user
    ? await prisma.member.findUnique({
        where: { userId: session.user.id },
        select: { fullName: true, email: true },
      })
    : null;

  return (
    <main>
      <section className="relative overflow-hidden bg-gray-950 pt-32 pb-20">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/60 to-gray-950" />
        <div className="container relative z-10 mx-auto px-4 text-center sm:px-6 lg:px-8">
          <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">Give</span>
          <h1 className="mt-3 mb-4 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Partner with the work.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-300 sm:text-xl">
            &ldquo;Each of you should give what you have decided in your heart to give, not reluctantly or
            under compulsion, for God loves a cheerful giver.&rdquo; — 2 Corinthians 9:7
          </p>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container mx-auto grid max-w-5xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
          <div className="rounded-2xl bg-antiflash-white p-6 sm:p-8">
            <GiveForm
              funds={funds}
              defaults={{
                fullName: member?.fullName ?? session?.user.name ?? "",
                email: member?.email ?? session?.user.email ?? "",
              }}
              signedIn={!!session?.user}
            />
          </div>
          <aside className="space-y-6 text-gray-700">
            <div>
              <h2 className="text-lg font-bold text-gray-900">How it works</h2>
              <p className="mt-2 text-sm">
                You&apos;ll be taken to Paystack&apos;s secure checkout to pay by Mobile Money (MTN, Telecel,
                AirtelTigo), card or bank. A receipt is emailed to you as soon as the payment clears.
              </p>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Supporting a project?</h2>
              <p className="mt-2 text-sm">
                Make a pledge on the{" "}
                <Link href="/projects" className="font-medium text-crayola hover:underline">
                  projects page
                </Link>{" "}
                and pay it from your member portal.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
