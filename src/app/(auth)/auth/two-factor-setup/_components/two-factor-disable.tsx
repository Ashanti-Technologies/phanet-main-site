"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export function TwoFactorDisable() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function disable() {
    setError(null);
    if (!password) {
      setError("Please enter your password to disable 2FA.");
      return;
    }
    startTransition(async () => {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) {
        setError(result.error.message || "Couldn't disable 2FA.");
        return;
      }
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Two-factor protects your admin account if your password or email is
          ever compromised. Keep it on unless you have a specific reason.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirming(true)}
          className="text-destructive"
        >
          <ShieldOff className="mr-2 h-4 w-4" />
          Disable two-factor
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="disable-pw">Confirm your password</Label>
        <Input
          id="disable-pw"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          onClick={disable}
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Disable 2FA
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setConfirming(false);
            setPassword("");
            setError(null);
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
