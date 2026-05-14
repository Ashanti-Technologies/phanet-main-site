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
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-foreground text-background p-10">
        {/* Background gradient layer */}
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground to-amber-900/40" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-mikado-yellow/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-background/80 hover:text-background"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to phanerosisnetwork.com
          </Link>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo.svg"
              alt="PHANET"
              width={48}
              height={48}
              className="brightness-0 invert"
            />
            <span className="text-xl font-semibold tracking-tight">
              Phanerosis Network
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            Stay connected to your church family.
          </h1>
          <p className="text-base text-background/70 leading-relaxed">
            Update your profile, RSVP to upcoming events, follow your giving
            history, and keep in touch with your church units — all in one
            place.
          </p>
          <div className="grid gap-3 pt-2">
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

        <p className="relative z-10 text-xs text-background/50">
          © {new Date().getFullYear()} Phanerosis Prayer Network International
        </p>
      </aside>

      {/* Right — login form */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-mikado-yellow text-lg font-bold text-black lg:mx-0">
              PN
            </div>
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
    <div className="rounded-lg border border-background/10 bg-background/5 backdrop-blur-sm p-3">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-background/60 mt-0.5">{body}</p>
    </div>
  );
}
