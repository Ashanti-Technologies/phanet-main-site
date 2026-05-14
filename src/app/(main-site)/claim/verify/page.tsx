import type { Metadata } from "next";
import Link from "next/link";
import { VerifyOtpForm } from "./_components/verify-otp-form";

export const metadata: Metadata = {
  title: "Verify your phone — PHANET",
};

export default async function VerifyClaimPage({
  searchParams,
}: {
  searchParams?: Promise<{ phone?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const phone = (params.phone ?? "").trim();

  if (!phone) {
    return (
      <main className="flex min-h-[70svh] items-center justify-center bg-background px-4 py-16">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-xl font-semibold">No phone number provided</h1>
          <p className="text-sm text-muted-foreground">
            Start the claim process again to receive a verification code.
          </p>
          <Link
            href="/claim"
            className="inline-block rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Back to claim
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[70svh] items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Enter your code
          </h1>
          <p className="text-sm text-muted-foreground">
            If we have a record for <strong>{phone}</strong>, we&apos;ve texted
            you a 6-digit verification code. It expires in 10 minutes.
          </p>
        </div>
        <VerifyOtpForm phone={phone} />
      </div>
    </main>
  );
}
