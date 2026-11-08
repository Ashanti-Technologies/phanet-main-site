"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createEventAccount } from "@/actions/event-registrations";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { GoogleLoginButton } from "@/app/components/auth";

export function AccountGate({ slug }: { slug: string }) {
  const callbackUrl = `/events/${slug}/register`;
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
    <div className="grid gap-6 md:grid-cols-2">
      <section className="space-y-4 rounded-md border bg-card p-6">
        <h2 className="text-lg font-semibold">Already have a PHANET account?</h2>
        <p className="text-sm text-muted-foreground">
          Sign in and we&apos;ll fill in what we already know about you.
        </p>
        <Button asChild className="w-full">
          <Link href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}>
            Sign in to register
          </Link>
        </Button>
        <GoogleLoginButton callbackUrl={callbackUrl} className="h-11 w-full" />
      </section>

      <section className="space-y-4 rounded-md border bg-card p-6">
        <h2 className="text-lg font-semibold">New here?</h2>
        <p className="text-sm text-muted-foreground">
          Create a free account to register. This doesn&apos;t make you a
          member — it just lets you view and update your booking.
        </p>
        {sentTo ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Check {sentTo} — we sent a link that brings you straight back to
              the form.
            </span>
          </div>
        ) : (
          <form action={submit} className="space-y-3">
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
                autoComplete="email"
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" variant="outline" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Email me a link to continue
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
