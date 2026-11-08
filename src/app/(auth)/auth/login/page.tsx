import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { MemberLoginForm } from "./_components/member-login-form";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const NOTICES: Record<string, string> = {
  "existing-account":
    "We found an existing account for this email. Sign in below to continue claiming your member record.",
  "already-claimed":
    "This claim link has already been used. Please sign in to your account.",
  "already-linked":
    "This member is already linked to an account. Please sign in.",
};

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const callbackUrl = first(sp.callbackUrl) || "/me";
  const prefilledEmail = first(sp.email) || "";
  const noticeKey = first(sp.notice) || "";
  const noticeMessage = noticeKey ? NOTICES[noticeKey] : null;

  return (
    <main className="min-h-svh grid lg:grid-cols-2 bg-background">
      {/* Left — ad / marketing column. Drop image, video, or pitch copy in here. */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-black text-white p-10">
        <Image
          src="/images/landing/happy.webp"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        {/* Scrim: light at top, heavy at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to phanerosisnetwork.com
          </Link>
        </div>

        <div className="relative z-10 mt-auto mb-8 space-y-6 max-w-md">
          <div className="grid gap-3">
            <Feature
              title="Your prayer life"
              body="Submit prayer requests and follow up with our pastoral team."
            />
            <Feature
              title="Your giving"
              body="View year-end statements and outstanding commitments."
            />
            <Feature
              title="Your community"
              body="Find your unit, your cell, and upcoming gatherings."
            />
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/60">
          © {new Date().getFullYear()} Phanerosis Prayer Network International
        </p>
      </aside>

      {/* Right — login form */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <Image
              src="/images/logo.svg"
              alt="PHANET"
              width={48}
              height={48}
              className="mx-auto mb-4 lg:mx-0"
            />
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your member portal.
            </p>
          </div>

          {noticeMessage ? (
            <div className="rounded-md border border-mikado-yellow/40 bg-mikado-yellow/10 p-3 text-sm text-foreground">
              {noticeMessage}
            </div>
          ) : null}

          <MemberLoginForm
            callbackUrl={callbackUrl}
            prefilledEmail={prefilledEmail}
          />

          <p className="text-center text-sm text-muted-foreground">
            New to PHANET?{" "}
            <Link
              href="/membership/apply"
              className="font-medium text-foreground hover:underline"
            >
              Apply for membership
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 backdrop-blur-md p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-white/75 mt-0.5">{body}</p>
    </div>
  );
}
