import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ShieldX, Home, LayoutDashboard } from "lucide-react";
import { getAbilityContext, isAdmin } from "@/lib/auth-guard";
import { exitPreview } from "@/actions/access";
import { AREAS, permissionsGranting } from "@/lib/rbac/catalog";

export default async function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ need?: string; preview?: string }>;
}) {
  const { need, preview: blockedByPreview } = await searchParams;
  const { preview } = await getAbilityContext();
  const [action, subject] = (need ?? "").split(":");
  const granting = action && subject ? permissionsGranting(action, subject) : [];
  const admin = await isAdmin();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-12">
          <ShieldX className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="mt-6 text-2xl font-bold">Access Denied</h1>
          <p className="mt-3 text-muted-foreground">
            You don&apos;t have permission to access this page.
          </p>
          {granting.length > 0 && (
            <div className="mt-4 rounded-md bg-muted/60 p-3 text-left text-sm">
              <p className="font-medium">This needs one of:</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {granting.map((d) => (
                  <li key={d.key}>
                    {AREAS[d.area].label} → {d.label}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-muted-foreground">Ask a Super Admin to add it to your role.</p>
            </div>
          )}
          {(preview || blockedByPreview) && (
            <div className="mt-4 rounded-md bg-amber-500/10 p-3 text-sm">
              <p>
                {preview
                  ? `You're viewing as ${preview.name}. Changes are turned off while previewing.`
                  : "Changes are turned off while previewing."}
              </p>
              {preview && (
                <form action={exitPreview} className="mt-2">
                  <Button type="submit" size="sm" variant="outline">Exit preview</Button>
                </form>
              )}
            </div>
          )}
          {subject === "AdminRole" && (
            <p className="mt-4 text-sm text-muted-foreground">Only Super Admins can manage admin access.</p>
          )}
          <div className="mt-8 flex flex-col gap-3">
            {admin && (
              <Button asChild>
                <Link href="/admin">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Back to admin
                </Link>
              </Button>
            )}
            <Button variant={admin ? "outline" : "default"} asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
