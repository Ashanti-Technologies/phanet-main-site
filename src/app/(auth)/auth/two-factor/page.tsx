import Image from "next/image";
import { TwoFactorChallenge } from "./_components/two-factor-challenge";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function TwoFactorChallengePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const callbackUrl = first(sp.callbackUrl) || "/admin";

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Image
            src="/images/logo.png"
            alt="PHANET"
            width={48}
            height={48}
            className="mx-auto mb-4 rounded-md bg-mikado-yellow p-1.5"
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            Verify your identity
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app — or use a
            backup code if you don&apos;t have it.
          </p>
        </div>

        <TwoFactorChallenge callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
