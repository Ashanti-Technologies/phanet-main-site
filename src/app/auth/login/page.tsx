"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GoogleLoginButton } from "@/app/components/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/projects";

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 text-3xl font-bold text-mikado-yellow">
          PHANET
        </div>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Sign in with your Google account to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <GoogleLoginButton callbackUrl={callbackUrl} className="w-full h-12" />

        <div className="text-center">
          <Button variant="link" asChild>
            <Link href="/projects">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LoginFallback() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-mikado-yellow" />
      </CardContent>
    </Card>
  );
}

export default function AuthLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Suspense fallback={<LoginFallback />}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
