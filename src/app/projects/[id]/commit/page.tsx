"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { createCommitment } from "@/actions/commitments";
import { getChurchUnits } from "@/actions/church-units";
import { GoogleLoginButton } from "@/app/components/auth";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
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
import { ArrowLeft, Loader2, CheckCircle, Heart } from "lucide-react";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

interface ChurchUnit {
  id: string;
  name: string;
}

export default function CommitmentPage(props: Props) {
  const params = use(props.params);
  const router = useRouter();
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
        setSession(result.data as { user: { name: string; email: string } });
      }
      setIsLoading(false);
    }

    async function loadChurchUnits() {
      const units = await getChurchUnits(true);
      setChurchUnits(units);
    }

    checkSession();
    loadChurchUnits();
  }, []);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const churchUnitValue = useCustomChurchUnit
        ? (formData.get("churchUnitCustom") as string)
        : (formData.get("churchUnit") as string);

      const data = {
        projectId: params.id,
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

      const result = await createCommitment(data);

      if (result.success) {
        setIsSuccess(true);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit commitment"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-mikado-yellow" />
      </div>
    );
  }

  // Success screen
  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card className="text-center">
          <CardContent className="py-12">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
            <h2 className="mt-6 text-2xl font-bold">Thank You!</h2>
            <p className="mt-3 text-muted-foreground">
              Your commitment has been received. We&apos;ll be in touch with payment
              details shortly.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button asChild>
                <Link href={`/projects/${params.id}`}>Back to Project</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/projects">View All Projects</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login required
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card className="text-center">
          <CardHeader>
            <Heart className="h-12 w-12 mx-auto text-mikado-yellow" />
            <CardTitle className="mt-4">Sign in to Continue</CardTitle>
            <CardDescription>
              Please sign in with your Google account to make a commitment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleLoginButton
              callbackUrl={`/projects/${params.id}/commit`}
              className="w-full h-12"
            />
            <Button variant="outline" asChild className="w-full">
              <Link href={`/projects/${params.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Commitment form
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Make a Commitment</h1>
          <p className="text-muted-foreground">
            Signed in as {session.user.email}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form action={handleSubmit} className="space-y-6">
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
                  <Label
                    htmlFor="customUnit"
                    className="text-xs text-muted-foreground"
                  >
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

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <Switch id="isAnonymous" name="isAnonymous" />
              <div>
                <Label htmlFor="isAnonymous">
                  Keep my contribution anonymous
                </Label>
                <p className="text-xs text-muted-foreground">
                  Your name won&apos;t appear on the public thank-you wall
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Heart className="mr-2 h-4 w-4" />
              )}
              Submit Commitment
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
