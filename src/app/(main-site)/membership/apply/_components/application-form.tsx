"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { submitMembershipApplication } from "@/actions/member-applications";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";

type Unit = { id: string; name: string };

export function MembershipApplicationForm({ units }: { units: Unit[] }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function submit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      try {
        await submitMembershipApplication({
          fullName: String(formData.get("fullName") || ""),
          phone: String(formData.get("phone") || ""),
          email: String(formData.get("email") || ""),
          unitId: String(formData.get("unitId") || ""),
          intro: String(formData.get("intro") || ""),
        });
        setSubmitted(true);
        setMessage("Your application has been received.");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Application failed");
      }
    });
  }

  if (submitted) {
    return (
      <div className="rounded-md border bg-muted/40 p-6 text-center">
        <h2 className="font-semibold">Application received</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A PHANET leader will review it and follow up with your signup invite.
        </p>
      </div>
    );
  }

  return (
    <form action={submit} className="space-y-4" aria-busy={isPending}>
      {message && (
        <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" autoComplete="tel" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Unit interest</Label>
        <Select name="unitId">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a ministry unit" />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id}>
                {unit.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="intro">Brief introduction</Label>
        <Textarea
          id="intro"
          name="intro"
          rows={5}
          placeholder="Tell us briefly about yourself and how you would like to connect with PHANET."
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit application
      </Button>
    </form>
  );
}
