"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, Chrome, KeyRound, Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { hasAnyAdminRole, parseRoles } from "@/lib/rbac/roles";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { GoogleLoginButton } from "@/app/components/auth";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/app/components/animate-ui/components/animate/tabs";

type Mode = "password" | "magic" | "google";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePasswordSignIn(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const email = String(formData.get("email") || "").trim();
      const password = String(formData.get("password") || "");

      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.message || "Invalid credentials");
        return;
      }

      const session = await authClient.getSession();
      const user = session?.data?.user as { role?: string } | undefined;
      if (!hasAnyAdminRole(parseRoles(user?.role))) {
        await authClient.signOut();
        setError("Access denied. Admin privileges required.");
        return;
      }

      router.push("/admin");
      router.refresh();
    });
  }

  function handleMagicLink(formData: FormData) {
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
        callbackURL: "/admin",
        errorCallbackURL: "/admin/login",
      });
      if (result.error) {
        setError(
          result.error.message ||
            "We couldn't send the link. Please try again.",
        );
        return;
      }
      setMessage(
        "Check your email — we just sent you a secure sign-in link. Admin access is verified after sign-in.",
      );
    });
  }

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-midnight-green lg:block">
        <Image
          src="/images/retreat.jpeg"
          alt="PHANET prayer retreat gathering"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/45 to-midnight-green/80" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-md bg-mikado-yellow text-base font-bold text-black">
              PN
            </div>
            <div>
              <p className="text-lg font-bold leading-none">PHANET</p>
              <p className="text-sm text-white/70">Admin CMS</p>
            </div>
          </div>

          <div className="max-w-lg space-y-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-mikado-yellow">
              Ministry Operations
            </p>
            <h1 className="text-4xl font-bold leading-tight">
              Steward content, prayer requests, events, and giving from one
              place.
            </h1>
            <p className="text-base leading-7 text-white/75">
              Manage PHANET&apos;s public ministry presence with clear admin
              tools for trusted leaders.
            </p>
          </div>
        </div>
      </section>

      <main className="flex min-h-svh items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-mikado-yellow text-lg font-bold text-black lg:mx-0">
              PN
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Admin Portal
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to manage PHANET content and ministry operations.
            </p>
          </div>

          <div className="space-y-4" aria-busy={isPending}>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid w-full grid-cols-3 rounded-md border bg-muted/30 p-1">
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
                  <form action={handlePasswordSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="admin@phanerosisnetwork.com"
                        required
                        spellCheck={false}
                      />
                    </div>
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
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isPending}
                    >
                      {isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="magic">
                  <form action={handleMagicLink} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="magic-email">Admin email</Label>
                      <Input
                        id="magic-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        placeholder="admin@phanerosisnetwork.com"
                        required
                        spellCheck={false}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isPending}
                    >
                      {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Email me a sign-in link
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      Admin access is verified after you click the link.
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="google">
                  <div className="space-y-4 py-2">
                    <GoogleLoginButton
                      callbackUrl="/admin"
                      className="h-11 w-full"
                    />
                    <p className="text-center text-xs text-muted-foreground">
                      Continue with your Google account. Admin access is
                      verified after sign-in.
                    </p>
                  </div>
                </TabsContent>
              </TabsContents>
            </Tabs>

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
        </div>
      </main>
    </div>
  );
}
