"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { createCommitment } from "@/actions/commitments";
import { getChurchUnits } from "@/actions/church-units";
import { GoogleLoginButton } from "@/app/components/auth";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import { Loader2, CheckCircle, Heart } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";

interface ChurchUnit {
  id: string;
  name: string;
}

export function CommitForm({ projectId }: { projectId: string }) {
  const [session, setSession] = useState<{
    user: { name: string; email: string };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [churchUnits, setChurchUnits] = useState<ChurchUnit[]>([]);
  const [useCustomChurchUnit, setUseCustomChurchUnit] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const result = await authClient.getSession();
      if (result?.data?.user) {
        const user = result.data.user as { id: string; name: string; email: string };
        setSession(result.data as { user: { name: string; email: string } });
        posthog.identify(user.id, { email: user.email, name: user.name });
      }
      // After identify, so a signed-in visitor's view isn't anonymous.
      posthog.capture("commitment_page_viewed", { project_id: projectId });
      setIsLoading(false);
    }

    async function loadChurchUnits() {
      const units = await getChurchUnits(true);
      setChurchUnits(units);
    }

    checkSession();
    loadChurchUnits();
  }, [projectId]);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const churchUnitValue = useCustomChurchUnit
        ? (formData.get("churchUnitCustom") as string)
        : (formData.get("churchUnit") as string);

      const data = {
        projectId,
        fullName: formData.get("fullName") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        whatsapp: formData.get("whatsapp") as string,
        address: formData.get("address") as string,
        country: formData.get("country") as string,
        churchUnit: churchUnitValue || undefined,
        amountCommitted: Number(formData.get("amount")),
        isAnonymous: formData.get("isAnonymous") === "on",
      };

      posthog.capture("commitment_submitted", {
        project_id: projectId,
        amount: data.amountCommitted,
        country: data.country,
        is_anonymous: data.isAnonymous,
        has_church_unit: !!data.churchUnit,
      });

      const result = await createCommitment(data);

      if (result.success) {
        setIsSuccess(true);
      }
    } catch (err) {
      posthog.captureException(err);
      setError(
        err instanceof Error ? err.message : "Failed to submit commitment"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-crayola" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="py-8 text-center">
        <CheckCircle className="mx-auto h-16 w-16 text-green-600" />
        <h2 className="mt-6 text-2xl font-bold text-gray-900">Thank you!</h2>
        <p className="mx-auto mt-3 max-w-md text-gray-600">
          Your commitment has been received. We&apos;ll be in touch with payment
          details shortly.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={`/projects/${projectId}`}
            className="rounded-full bg-crayola px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600"
          >
            Back to project
          </Link>
          <Link
            href="/projects"
            className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-white"
          >
            View all projects
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="py-8 text-center">
        <Heart className="mx-auto h-12 w-12 text-crayola" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Sign in to continue</h2>
        <p className="mx-auto mt-2 max-w-sm text-gray-600">
          Please sign in with your Google account to make a commitment.
        </p>
        <GoogleLoginButton
          callbackUrl={`/projects/${projectId}/commit`}
          className="mx-auto mt-6 h-12 w-full max-w-sm"
        />
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <p className="text-sm text-gray-500">Signed in as {session.user.email}</p>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={session.user.name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={session.user.email}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">WhatsApp Number</Label>
          <Input id="whatsapp" name="whatsapp" type="tel" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country *</Label>
        <Input id="country" name="country" placeholder="Ghana" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" name="address" rows={2} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ministry Family / Church Unit</Label>
          <div className="flex items-center gap-2">
            <Label htmlFor="customUnit" className="text-xs text-muted-foreground">
              Enter custom
            </Label>
            <Switch
              id="customUnit"
              checked={useCustomChurchUnit}
              onCheckedChange={setUseCustomChurchUnit}
            />
          </div>
        </div>
        {useCustomChurchUnit ? (
          <Input
            name="churchUnitCustom"
            placeholder="Enter your ministry family or church unit"
          />
        ) : (
          <Select name="churchUnit">
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {churchUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.name}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-muted-foreground">
          Which part of the ministry family do you belong to?
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Commitment Amount (GH₵) *</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min={1}
          step="0.01"
          placeholder="0.00"
          required
        />
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-white p-4">
        <Switch id="isAnonymous" name="isAnonymous" />
        <div>
          <Label htmlFor="isAnonymous">Keep my contribution anonymous</Label>
          <p className="text-xs text-muted-foreground">
            Your name won&apos;t appear on the public thank-you wall
          </p>
        </div>
      </div>

      <Button
        type="submit"
        className="h-12 w-full rounded-full bg-crayola text-base font-semibold text-white hover:bg-red-600"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Heart className="mr-2 h-4 w-4" />
        )}
        Submit commitment
      </Button>
    </form>
  );
}
