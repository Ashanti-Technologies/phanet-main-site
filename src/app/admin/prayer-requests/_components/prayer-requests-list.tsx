"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updatePrayerRequest } from "@/actions/prayer-requests";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { StatusBadge } from "@/app/admin/_components/status-badge";

type PrayerRequest = {
  id: string;
  content: string;
  name: string | null;
  status: "NEW" | "IN_PRAYER" | "PRAYED" | "ARCHIVED";
  adminNote: string | null;
  createdAt: Date | string;
};

export function PrayerRequestsList({
  prayers,
}: {
  prayers: PrayerRequest[];
}) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);

  async function save(prayer: PrayerRequest, formData: FormData) {
    setSavingId(prayer.id);
    await updatePrayerRequest({
      id: prayer.id,
      status: String(formData.get("status")) as PrayerRequest["status"],
      adminNote: String(formData.get("adminNote") || ""),
    });
    setSavingId(null);
    router.refresh();
  }

  if (prayers.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No prayer requests yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {prayers.map((prayer) => (
        <form
          key={prayer.id}
          action={(formData) => save(prayer, formData)}
          className="space-y-3 rounded-md border p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-medium">{prayer.name || "Anonymous"}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(prayer.createdAt).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={prayer.status} />
          </div>
          <p className="whitespace-pre-wrap text-sm leading-6">{prayer.content}</p>
          <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select name="status" defaultValue={prayer.status}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="IN_PRAYER">In prayer</SelectItem>
                  <SelectItem value="PRAYED">Prayed</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Admin note</label>
              <Textarea
                name="adminNote"
                defaultValue={prayer.adminNote ?? ""}
                rows={2}
              />
            </div>
            <Button type="submit" disabled={savingId === prayer.id}>
              {savingId === prayer.id && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </form>
      ))}
    </div>
  );
}
