"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import {
  startClaimByEmail,
  startClaimByPhone,
} from "@/actions/member-claim";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";

type Sent = null | { channel: "EMAIL" | "PHONE"; recipient: string };

export function ClaimForm() {
  const router = useRouter();
  const [sent, setSent] = useState<Sent>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitEmail(formData: FormData) {
    setError(null);
    const email = String(formData.get("email") || "").trim();
    startTransition(async () => {
      try {
        await startClaimByEmail({ email });
        setSent({ channel: "EMAIL", recipient: email });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        );
      }
    });
  }

  function submitPhone(formData: FormData) {
    setError(null);
    const phone = String(formData.get("phone") || "").trim();
    startTransition(async () => {
      try {
        await startClaimByPhone({ phone });
        setSent({ channel: "PHONE", recipient: phone });
        router.push(`/claim/verify?phone=${encodeURIComponent(phone)}`);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        );
      }
    });
  }

  if (sent?.channel === "EMAIL") {
    return (
      <div
        role="status"
        className="rounded-lg border bg-card p-6 text-center text-sm"
      >
        <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-mikado-yellow" />
        <p className="font-medium">Check your inbox</p>
        <p className="mt-2 text-muted-foreground">
          If we have a member record matching <strong>{sent.recipient}</strong>,
          we&apos;ve sent a secure link. Open it within 15 minutes to complete your
          profile.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Didn&apos;t receive anything? Check your spam folder, then try again
          with a different email or phone number.
        </p>
        <button
          type="button"
          className="mt-4 text-xs underline text-muted-foreground hover:text-foreground"
          onClick={() => setSent(null)}
        >
          Try a different contact
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>
        <TabsContent value="email" className="mt-4">
          <form action={submitEmail} className="space-y-4" aria-busy={isPending}>
            <div className="space-y-2">
              <Label htmlFor="email">Email on file</Label>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll email you a secure link to complete your profile.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send claim link
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="phone" className="mt-4">
          <form action={submitPhone} className="space-y-4" aria-busy={isPending}>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone on file</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="e.g. 024 123 4567"
                required
                maxLength={40}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll text you a 6-digit verification code.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send verification code
            </Button>
          </form>
        </TabsContent>
      </Tabs>
      <p className="text-center text-xs text-muted-foreground">
        Can&apos;t find your record? Contact admin on whatsapp (0501430748) to add you, or
        apply from the membership page.
      </p>
    </div>
  );
}
