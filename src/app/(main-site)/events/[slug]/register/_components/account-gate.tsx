"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createEventAccount } from "@/actions/event-registrations";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { GoogleLoginButton } from "@/app/components/auth";

export function AccountGate({ slug, callbackUrl }: { slug: string; callbackUrl: string }) {
  const [isPending, startTransition] = useTransition();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const email = String(formData.get("email") ?? "");
      const result = await createEventAccount({
        eventSlug: slug,
        name: String(formData.get("name") ?? ""),
        email,
      });
      if (result.success) setSentTo(email);
      else setError(result.error);
    });
  }

  return (
    <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">
          Let&apos;s get you registered
        </h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll email you a link that brings you straight back here. Your
          account lets you view and change your booking. It doesn&apos;t make
          you a member.
        </p>
      </div>

      {sentTo ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-800 dark:text-emerald-300"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Check your email</p>
            <p>
              We sent a link to <strong>{sentTo}</strong>. Open it on this
              phone to continue.
            </p>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="font-medium underline underline-offset-4"
            >
              Use a different email
            </button>
          </div>
        </div>
      ) : (
        <form action={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gate-name">Full name</Label>
            <Input id="gate-name" name="name" autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gate-email">Email</Label>
            <Input
              id="gate-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="h-12 w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue with email
          </Button>
        </form>
      )}

      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <GoogleLoginButton callbackUrl={callbackUrl} className="h-12 w-full" />

      <p className="text-center text-sm text-muted-foreground">
        Have a PHANET password?{" "}
        <Link
          href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}
