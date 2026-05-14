import type { Metadata } from "next";
import { ClaimForm } from "./_components/claim-form";

export const metadata: Metadata = {
  title: "Claim your member record — PHANET",
  description:
    "Find and complete your PHANET member profile securely using the email or phone we have on file.",
};

export default async function ClaimPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const error =
    params.error === "expired"
      ? "That claim link is no longer valid. Request a new one below."
      : params.error === "invalid"
        ? "We couldn't verify that claim link. Please try again."
        : null;

  return (
    <main className="flex min-h-[70svh] items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Claim your Membership record
          </h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ve already prepared a profile for you. Enter the email or
            phone on file and we&apos;ll send you a secure way to complete your
            details.
          </p>
        </div>
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <ClaimForm />
      </div>
    </main>
  );
}
