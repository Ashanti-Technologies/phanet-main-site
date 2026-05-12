"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateMyProfile } from "@/actions/member-portal";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

type MemberProfile = {
  preferredName: string | null;
  phone: string | null;
  whatsapp: string | null;
  addressLine: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  occupation: string | null;
};

export function ProfileForm({ member }: { member: MemberProfile }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function submit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateMyProfile({
          preferredName: String(formData.get("preferredName") || ""),
          phone: String(formData.get("phone") || ""),
          whatsapp: String(formData.get("whatsapp") || ""),
          addressLine: String(formData.get("addressLine") || ""),
          city: String(formData.get("city") || ""),
          region: String(formData.get("region") || ""),
          country: String(formData.get("country") || "Ghana"),
          occupation: String(formData.get("occupation") || ""),
        });
        setMessage("Profile updated.");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Profile update failed");
      }
    });
  }

  return (
    <form action={submit} className="space-y-4" aria-busy={isPending}>
      {message && (
        <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Preferred name" name="preferredName" value={member.preferredName} />
        <Field label="Occupation" name="occupation" value={member.occupation} />
        <Field label="Phone" name="phone" value={member.phone} />
        <Field label="WhatsApp" name="whatsapp" value={member.whatsapp} />
        <Field label="Address" name="addressLine" value={member.addressLine} />
        <Field label="City" name="city" value={member.city} />
        <Field label="Region" name="region" value={member.region} />
        <Field label="Country" name="country" value={member.country ?? "Ghana"} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save profile
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string | null;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={value ?? ""} />
    </div>
  );
}
