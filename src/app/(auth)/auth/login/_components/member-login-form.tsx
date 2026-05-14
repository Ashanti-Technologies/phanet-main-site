"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { GoogleLoginButton } from "@/app/components/auth";

export function MemberLoginForm({
  callbackUrl,
  prefilledEmail = "",
}: {
  callbackUrl: string;
  prefilledEmail?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function sendMagicLink(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const email = String(formData.get("email") || "").trim();
      if (!email) {
        setError("Please enter your email.");
        return;
      }
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: callbackUrl,
        errorCallbackURL: "/auth/login",
      });
      if (result.error) {
        setError(
          result.error.message ||
            "We couldn't send the link. Please check your email and try again.",
        );
        return;
      }
      setMessage(
        "Check your email — we just sent you a secure sign-in link.",
      );
    });
  }

  return (
    <div className="space-y-5" aria-busy={isPending}>
      <form action={sendMagicLink} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={prefilledEmail}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Email me a sign-in link
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          No password needed — we&apos;ll send a one-time link.
        </p>
      </form>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <GoogleLoginButton callbackUrl={callbackUrl} className="h-11 w-full" />

      {message && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
