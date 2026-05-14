"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HeartHandshake, Loader2, Send } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { formatPrayerStatus } from "@/lib/format";
import { EmptyState } from "../../_components/empty-state";

type PrayerItem = {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  prayedAt: string | null;
};

export function PrayerTab({
  defaultName,
  defaultEmail,
  defaultPhone,
  requests,
}: {
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  requests: PrayerItem[];
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!content.trim()) {
      setMessage({ type: "error", text: "Please share what you'd like prayer for." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/prayer-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            name: defaultName,
            email: defaultEmail,
            phone: defaultPhone,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to submit");
        }
        setContent("");
        setMessage({
          type: "success",
          text: "Thank you. Your request has been received and will be lifted in prayer.",
        });
        router.refresh();
      } catch (err) {
        setMessage({
          type: "error",
          text:
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-mikado-yellow/40 bg-mikado-yellow/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartHandshake className="h-4 w-4 text-midnight-green" />
            Submit a prayer request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="prayer-content" className="text-xs">
              What would you like us to pray with you about?
            </Label>
            <Textarea
              id="prayer-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share as much or as little as you'd like…"
              rows={4}
              maxLength={2000}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground">
              Submitting as <strong>{defaultName}</strong>
              {defaultEmail ? ` · ${defaultEmail}` : ""}
            </p>
          </div>
          {message ? (
            <div
              className={
                message.type === "success"
                  ? "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"
                  : "rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900"
              }
            >
              {message.text}
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="bg-midnight-green text-mikado-yellow hover:bg-midnight-green/90"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send request
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-midnight-green">
          My prayer wall
        </h2>
        {requests.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title="Your prayer wall is quiet"
            description="Send your first request above and we'll lift it up with you."
          />
        ) : (
          <div className="space-y-3">
            {requests.map((req) => {
              const created = new Date(req.createdAt);
              const isPrayed =
                req.status === "PRAYED" || req.status === "ARCHIVED";
              return (
                <article
                  key={req.id}
                  className="rounded-lg border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        isPrayed
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-amber-300 bg-amber-50 text-amber-900"
                      }
                    >
                      {formatPrayerStatus(req.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Submitted{" "}
                      {created.toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm text-foreground">
                    {req.content}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
