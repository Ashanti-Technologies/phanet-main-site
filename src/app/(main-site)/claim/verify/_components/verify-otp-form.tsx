"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { verifyClaimOtp } from "@/actions/member-claim";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export function VerifyOtpForm({ phone }: { phone: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    const code = String(formData.get("code") || "").trim();
    startTransition(async () => {
      try {
        const result = await verifyClaimOtp({ phone, code });
        if (!result.ok) {
          setError("That code didn't match. Try again or request a new one.");
          return;
        }
        router.push(`/claim/${result.token}`);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form action={submit} className="space-y-4" aria-busy={isPending}>
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="code">Verification code</Label>
        <Input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="123456"
          className="text-center text-lg tracking-[0.4em]"
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Verify and continue
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Didn&apos;t get a code?{" "}
        <Link href="/claim" className="underline hover:text-foreground">
          Start again
        </Link>
      </p>
    </form>
  );
}
