"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

type Step = "password" | "scan" | "verify" | "done";

function extractSecret(uri: string) {
  try {
    const params = new URL(uri).searchParams;
    return params.get("secret");
  } catch {
    return null;
  }
}

export function TwoFactorEnrollment() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [showSecret, setShowSecret] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError(null);
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    startTransition(async () => {
      const result = await authClient.twoFactor.enable({
        password,
      });
      if (result.error || !result.data) {
        setError(result.error?.message || "Couldn't generate setup code.");
        return;
      }
      setTotpUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
      setStep("scan");
    });
  }

  function verify() {
    setError(null);
    if (!code || code.length < 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    startTransition(async () => {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError(
          result.error.message || "That code didn't match. Try again.",
        );
        return;
      }
      setStep("done");
      router.refresh();
    });
  }

  if (step === "password") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="enable-pw">Confirm your password</Label>
          <Input
            id="enable-pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your admin password"
          />
          <p className="text-xs text-muted-foreground">
            We need your password to generate a fresh authenticator secret.
          </p>
        </div>
        {error ? <ErrorBox text={error} /> : null}
        <Button onClick={generate} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          Generate setup code
        </Button>
      </div>
    );
  }

  if (step === "scan" || step === "verify") {
    const secret = totpUri ? extractSecret(totpUri) : null;
    return (
      <div className="space-y-5">
        <ol className="space-y-1.5 text-sm">
          <li>
            <strong>1.</strong> Open Google Authenticator (or 1Password,
            Authy, etc.).
          </li>
          <li>
            <strong>2.</strong> Scan the QR code below — or enter the secret
            manually.
          </li>
          <li>
            <strong>3.</strong> Enter the 6-digit code the app shows you.
          </li>
        </ol>

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="rounded-lg border bg-white p-3">
            {totpUri ? (
              <QRCodeSVG value={totpUri} size={176} />
            ) : null}
          </div>
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Manual entry secret
              </Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 select-all rounded-md border bg-muted px-2.5 py-2 font-mono text-xs tracking-wider">
                  {secret
                    ? showSecret
                      ? secret
                      : "•".repeat(secret.length)
                    : "—"}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((v) => !v)}
                  aria-label={showSecret ? "Hide secret" : "Reveal secret"}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                {secret ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(secret)}
                    aria-label="Copy secret"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totp-code">Code from your authenticator</Label>
          <Input
            id="totp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            className="font-mono text-lg tracking-[0.35em]"
          />
        </div>

        {error ? <ErrorBox text={error} /> : null}

        <Button onClick={verify} disabled={isPending || code.length < 6}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Verify &amp; enable 2FA
        </Button>
      </div>
    );
  }

  // step === "done"
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
        <div>
          <p className="font-medium text-emerald-900">
            Two-factor authentication is on.
          </p>
          <p className="text-sm text-emerald-900/80">
            From now on, every admin sign-in will ask for a 6-digit code from
            your authenticator app.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Save these backup codes somewhere safe
        </p>
        <p className="text-xs text-muted-foreground">
          Each code can be used once if you lose access to your authenticator.
          They will not be shown again.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted p-3 font-mono text-sm">
          {backupCodes.map((c) => (
            <span key={c} className="select-all">
              {c}
            </span>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            navigator.clipboard.writeText(backupCodes.join("\n"))
          }
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy all codes
        </Button>
      </div>

      <Button
        type="button"
        onClick={() => router.push("/admin")}
        className="bg-midnight-green text-mikado-yellow hover:bg-midnight-green/90"
      >
        Continue to admin
      </Button>
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {text}
    </div>
  );
}
