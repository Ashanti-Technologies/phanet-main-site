"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { createHousehold, updateHousehold } from "@/actions/households";

export type HouseholdFormValues = {
  id?: string;
  name: string;
  addressLine: string;
  city: string;
  region: string;
  notes: string;
};

export function HouseholdForm({ initial }: { initial: HouseholdFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof HouseholdFormValues>(
    key: K,
    value: HouseholdFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (values.id) {
          await updateHousehold(values as never);
          router.push(`/admin/members/households/${values.id}`);
        } else {
          const res = await createHousehold(values as never);
          router.push(`/admin/members/households/${res.data.id}`);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <Label className="text-xs">Name *</Label>
        <Input
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Address</Label>
        <Input
          value={values.addressLine}
          onChange={(e) => set("addressLine", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input value={values.city} onChange={(e) => set("city", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Region</Label>
          <Input
            value={values.region}
            onChange={(e) => set("region", e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
        />
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {values.id ? "Save changes" : "Create household"}
        </Button>
      </div>
    </form>
  );
}
