"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateMyNotifications } from "@/actions/member-portal";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";

export function NotificationsForm({
  notifyByEmail,
  notifyBySms,
}: {
  notifyByEmail: boolean;
  notifyBySms: boolean;
}) {
  const [email, setEmail] = useState(notifyByEmail);
  const [sms, setSms] = useState(notifyBySms);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateMyNotifications({
          notifyByEmail: email,
          notifyBySms: sms,
        });
        setMessage("Notification preferences updated.");
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  return (
    <div className="space-y-5">
      {message && (
        <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
          {message}
        </div>
      )}
      <div className="flex items-center justify-between rounded-md border p-4">
        <Label htmlFor="notifyByEmail">Email updates</Label>
        <Switch id="notifyByEmail" checked={email} onCheckedChange={setEmail} />
      </div>
      <div className="flex items-center justify-between rounded-md border p-4">
        <Label htmlFor="notifyBySms">SMS updates</Label>
        <Switch id="notifyBySms" checked={sms} onCheckedChange={setSms} />
      </div>
      <Button onClick={save} disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save preferences
      </Button>
    </div>
  );
}
