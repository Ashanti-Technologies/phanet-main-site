"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { hasAnyAdminRole, parseRoles } from "@/lib/rbac/roles";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      const email = String(formData.get("email"));
      const password = String(formData.get("password"));

      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message || "Invalid credentials");
        setIsLoading(false);
        return;
      }

      const session = await authClient.getSession();
      const user = session?.data?.user as { role?: string } | undefined;
      if (!hasAnyAdminRole(parseRoles(user?.role))) {
        await authClient.signOut();
        setError("Access denied. Admin privileges required.");
        setIsLoading(false);
        return;
      }

      router.push("/admin");
    } catch {
      setError("Login failed. Please try again.");
      setIsLoading(false);
    }
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
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
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

          <form
            action={handleSubmit}
            className="space-y-4"
            aria-busy={isLoading}
          >
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
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
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
