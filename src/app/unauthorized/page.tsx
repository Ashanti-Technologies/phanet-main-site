import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { ShieldX, Home, ArrowLeft } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-12">
          <ShieldX className="h-16 w-16 mx-auto text-destructive" />
          <h1 className="mt-6 text-2xl font-bold">Access Denied</h1>
          <p className="mt-3 text-muted-foreground">
            You don't have permission to access this page.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/projects">
                <ArrowLeft className="mr-2 h-4 w-4" />
                View Projects
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
