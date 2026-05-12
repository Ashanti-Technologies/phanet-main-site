"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  createService,
  updateService,
  deleteService,
} from "@/actions/attendance";

export type ServiceFormValues = {
  id?: string;
  title: string;
  date: string;
  location: string;
  notes: string;
};

export function ServiceForm({ initial }: { initial: ServiceFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  function set<K extends keyof ServiceFormValues>(
    key: K,
    value: ServiceFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (values.id) {
          await updateService(values as never);
          router.push(`/admin/services`);
        } else {
          const res = await createService(values as never);
          router.push(`/admin/services/${res.data.id}/check-in`);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  async function handleDelete() {
    if (!values.id) return;
    if (!confirm("Delete this service and its attendance records?")) return;
    setDeleting(true);
    try {
      await deleteService(values.id);
      router.push("/admin/services");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <Label className="text-xs">Title *</Label>
        <Input
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Sunday service — 12 May 2026"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Date & time *</Label>
        <Input
          type="datetime-local"
          value={values.date}
          onChange={(e) => set("date", e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Location</Label>
        <Input
          value={values.location}
          onChange={(e) => set("location", e.target.value)}
        />
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

      <div className="flex justify-between gap-2 border-t pt-4">
        {values.id ? (
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting || pending}
            className="text-destructive hover:text-destructive"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-1.5" />
            )}
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
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
            {values.id ? "Save changes" : "Create service"}
          </Button>
        </div>
      </div>
    </form>
  );
}
