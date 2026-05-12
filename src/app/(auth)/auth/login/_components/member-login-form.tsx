"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, KeyRound, Mail, Chrome } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { GoogleLoginButton } from "@/app/components/auth";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsContents,
} from "@/app/components/animate-ui/components/animate/tabs";

type Mode = "password" | "magic" | "google";

export function MemberLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function signIn(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const email = String(formData.get("email") || "");

      if (mode === "magic") {
        const result = await authClient.signIn.magicLink({
          email,
          callbackURL: callbackUrl,
          errorCallbackURL: "/auth/login",
        });
        if (result.error) {
          setError(result.error.message || "Unable to send sign-in link");
          return;
        }
        setMessage("Check your email for a secure sign-in link.");
        return;
      }

      const result = await authClient.signIn.email({
        email,
        password: String(formData.get("password") || ""),
      });
      if (result.error) {
        setError(result.error.message || "Invalid credentials");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" aria-busy={isPending}>
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList className="grid grid-cols-3 rounded-md border bg-muted/30 p-1 w-full">
          <TabsTrigger value="password" className="gap-1.5">
            <KeyRound className="h-3.5 w-3.5" />
            Password
          </TabsTrigger>
          <TabsTrigger value="magic" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Magic link
          </TabsTrigger>
          <TabsTrigger value="google" className="gap-1.5">
            <Chrome className="h-3.5 w-3.5" />
            Google
          </TabsTrigger>
        </TabsList>

        <TabsContents className="mt-5">
          <TabsContent value="password">
            <form action={signIn} className="space-y-4">
              <FieldEmail />
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="magic">
            <form action={signIn} className="space-y-4">
              <FieldEmail />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Email me a sign-in link
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                We&apos;ll send a one-time link — no password needed.
              </p>
            </form>
          </TabsContent>

          <TabsContent value="google">
            <div className="space-y-4 py-2">
              <GoogleLoginButton
                callbackUrl={callbackUrl}
                className="w-full h-11"
              />
              <p className="text-center text-xs text-muted-foreground">
                Continue with your Google account.
              </p>
            </div>
          </TabsContent>
        </TabsContents>
      </Tabs>

      {message && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
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

function FieldEmail() {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
      />
    </div>
  );
}
