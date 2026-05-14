import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert, ShieldCheck } from "lucide-react";
import { hasAnyAdminRole, parseRoles } from "@/lib/rbac/roles";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { TwoFactorEnrollment } from "./_components/two-factor-enrollment";
import { TwoFactorDisable } from "./_components/two-factor-disable";

export const dynamic = "force-dynamic";

export default async function TwoFactorSetupPage() {
  const session = await getServerAuthSession();
  if (!session?.user) {
    redirect("/admin/login?callbackUrl=/auth/two-factor-setup");
  }

  const roles = parseRoles(session.user.role);
  if (!hasAnyAdminRole(roles)) {
    redirect("/unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, twoFactorEnabled: true },
  });
  const enabled = user?.twoFactorEnabled ?? false;

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <Image
            src="/images/logo.png"
            alt="PHANET"
            width={48}
            height={48}
            className="mx-auto mb-3 rounded-md bg-mikado-yellow p-1.5"
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            Two-factor authentication
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Required for admins who sign in with email + password.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {enabled ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-amber-600" />
              )}
              <CardTitle className="text-base">
                {enabled
                  ? "2FA is enabled on your admin account"
                  : "Set up 2FA to continue"}
              </CardTitle>
            </div>
            <CardDescription>
              {enabled
                ? "Every email + password sign-in to the admin will ask for your authenticator code."
                : "Use Google Authenticator, 1Password, or any TOTP app. Sign-ins via Google or magic link skip this challenge."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enabled ? <TwoFactorDisable /> : <TwoFactorEnrollment />}
          </CardContent>
        </Card>

        {enabled ? (
          <div className="text-center">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to admin
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
