"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, KeySquare, Loader2, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

type Mode = "totp" | "backup";

export function TwoFactorChallenge({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!code) {
      setError(
        mode === "totp"
          ? "Enter the 6-digit code from your authenticator."
          : "Enter one of your backup codes.",
      );
      return;
    }
    startTransition(async () => {
      const result =
        mode === "totp"
          ? await authClient.twoFactor.verifyTotp({ code })
          : await authClient.twoFactor.verifyBackupCode({ code });
      if (result.error) {
        setError(
          result.error.message ||
            "That code didn't match. Try again, or use a backup code.",
        );
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5" aria-busy={isPending}>
      <div className="space-y-2">
        <Label htmlFor="code">
          {mode === "totp" ? "Authenticator code" : "Backup code"}
        </Label>
        <Input
          id="code"
          inputMode={mode === "totp" ? "numeric" : "text"}
          autoComplete="one-time-code"
          autoFocus
          placeholder={mode === "totp" ? "123456" : "xxxxxxxx"}
          value={code}
          onChange={(e) =>
            setCode(
              mode === "totp"
                ? e.target.value.replace(/\D/g, "").slice(0, 6)
                : e.target.value.trim(),
            )
          }
          maxLength={mode === "totp" ? 6 : 32}
          className="font-mono text-lg tracking-[0.3em]"
        />
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        )}
        Verify and continue
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "totp" ? "backup" : "totp"));
          setCode("");
          setError(null);
        }}
        className="flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {mode === "totp" ? (
          <>
            <KeySquare className="h-3 w-3" />
            Use a backup code instead
          </>
        ) : (
          <>
            <ShieldCheck className="h-3 w-3" />
            Use my authenticator app instead
          </>
        )}
      </button>
    </div>
  );
}
