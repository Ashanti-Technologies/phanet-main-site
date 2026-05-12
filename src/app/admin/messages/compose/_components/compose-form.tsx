"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Eye, Users } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Switch } from "@/app/components/ui/switch";
import { Badge } from "@/app/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { resolveSegment, sendBatch } from "@/actions/messages";

type Channel = "EMAIL" | "SMS";
type Status =
  | ""
  | "VISITOR"
  | "PENDING_APPROVAL"
  | "REGULAR"
  | "MEMBER"
  | "INACTIVE";
type AgeBucket = "" | "under18" | "18-29" | "30-49" | "50-69" | "70plus";

type Template = {
  id: string;
  name: string;
  channel: Channel;
  subject: string | null;
  body: string;
};

type Option = { id: string; name?: string; label?: string };

const NONE = "__none__";

export function ComposeForm({
  templates,
  units,
  tags,
}: {
  templates: Template[];
  units: Option[];
  tags: Option[];
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState<string>(NONE);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [unitId, setUnitId] = useState<string>(NONE);
  const [tagId, setTagId] = useState<string>(NONE);
  const [status, setStatus] = useState<Status>("");
  const [ageBucket, setAgeBucket] = useState<AgeBucket>("");
  const [respectPreferences, setRespectPreferences] = useState(true);

  const [preview, setPreview] = useState<{
    count: number;
    sample: {
      id: string;
      fullName: string;
      preferredName: string | null;
      email: string | null;
      phone: string | null;
    }[];
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filteredTemplates = templates.filter((t) => t.channel === channel);

  function applyTemplate(id: string) {
    setTemplateId(id);
    if (id === NONE) return;
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setSubject(tpl.subject ?? "");
    setBody(tpl.body);
    if (!name) setName(tpl.name);
  }

  function segmentPayload() {
    return {
      q: null,
      unitId: unitId === NONE ? null : unitId,
      tagId: tagId === NONE ? null : tagId,
      status: status || null,
      ageBucket: ageBucket || null,
      respectPreferences,
    };
  }

  function runPreview() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await resolveSegment(
          segmentPayload() as never,
          channel,
        );
        setPreview(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to preview");
      }
    });
  }

  function send() {
    setError(null);
    if (!preview || preview.count === 0) {
      setError("Resolve the segment first — no recipients to send to.");
      return;
    }
    if (!confirm(`Send to ${preview.count} member(s)?`)) return;
    startTransition(async () => {
      try {
        const batch = await sendBatch({
          name: name || `${channel} broadcast`,
          channel,
          templateId: templateId === NONE ? null : templateId,
          subject: channel === "EMAIL" ? subject : null,
          body,
          segment: segmentPayload(),
        } as never);
        router.push(`/admin/messages/batches/${batch.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      }
    });
  }

  const sampleVars =
    preview && preview.sample.length > 0
      ? {
          firstName:
            (preview.sample[0].preferredName ?? preview.sample[0].fullName).split(
              " ",
            )[0] ?? "",
          fullName: preview.sample[0].fullName,
          preferredName:
            preview.sample[0].preferredName ?? preview.sample[0].fullName,
          unitName: "",
        }
      : null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Channel + template */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">1. Channel & template</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Channel</Label>
            <Select
              value={channel}
              onValueChange={(v) => {
                setChannel(v as Channel);
                setTemplateId(NONE);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Template (optional)</Label>
            <Select value={templateId} onValueChange={applyTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Freeform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Freeform</SelectItem>
                {filteredTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">2. Content</h2>
        <div className="space-y-1.5">
          <Label className="text-xs">Internal name (for batch history)</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Easter Sunday reminder"
          />
        </div>
        {channel === "EMAIL" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Subject *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">
            Body * — variables: {"{{firstName}}"}, {"{{fullName}}"},{" "}
            {"{{unitName}}"}
          </Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={channel === "EMAIL" ? 12 : 6}
            required
          />
        </div>
      </section>

      {/* Segment */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">3. Segment</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Unit</Label>
            <Select value={unitId} onValueChange={setUnitId}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>All units</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tag</Label>
            <Select value={tagId} onValueChange={setTagId}>
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>All tags</SelectItem>
                {tags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <Select
              value={status || NONE}
              onValueChange={(v) => setStatus(v === NONE ? "" : (v as Status))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>All statuses</SelectItem>
                <SelectItem value="VISITOR">Visitor</SelectItem>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Age</Label>
            <Select
              value={ageBucket || NONE}
              onValueChange={(v) =>
                setAgeBucket(v === NONE ? "" : (v as AgeBucket))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>All ages</SelectItem>
                <SelectItem value="under18">Under 18</SelectItem>
                <SelectItem value="18-29">18–29</SelectItem>
                <SelectItem value="30-49">30–49</SelectItem>
                <SelectItem value="50-69">50–69</SelectItem>
                <SelectItem value="70plus">70+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-md border p-3">
          <Label className="text-sm">
            Skip members who opted out of {channel === "EMAIL" ? "emails" : "SMS"}
          </Label>
          <Switch
            checked={respectPreferences}
            onCheckedChange={setRespectPreferences}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={runPreview}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Users className="h-4 w-4 mr-1.5" />
          )}
          Resolve recipients
        </Button>
      </section>

      {preview && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4" />
            4. Preview
          </h2>
          <Badge variant="outline" className="text-sm">
            {preview.count.toLocaleString()} recipient
            {preview.count === 1 ? "" : "s"}
          </Badge>
          {preview.sample.length > 0 && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-xs text-muted-foreground">
                First recipients:
              </p>
              <ul className="text-xs space-y-1">
                {preview.sample.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span>{s.preferredName ?? s.fullName}</span>
                    <span className="text-muted-foreground">
                      {channel === "EMAIL" ? s.email : s.phone}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sampleVars && (
            <div className="rounded-md border p-3 space-y-2 bg-muted/30">
              <p className="text-xs font-medium">
                Preview for {sampleVars.fullName}:
              </p>
              {channel === "EMAIL" && (
                <p className="text-sm font-semibold">
                  {renderClient(subject, sampleVars)}
                </p>
              )}
              <div
                className="text-sm prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html:
                    channel === "EMAIL"
                      ? renderClient(body, sampleVars)
                      : escapeHtml(renderClient(body, sampleVars)),
                }}
              />
            </div>
          )}
        </section>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={send}
          disabled={pending || !preview || preview.count === 0}
        >
          {pending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          <Send className="h-4 w-4 mr-1.5" /> Send
        </Button>
      </div>
    </div>
  );
}

function renderClient(
  template: string,
  data: Record<string, string | number | null | undefined>,
): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const v = data[key];
    return v === null || v === undefined ? "" : String(v);
  });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", "<br/>");
}
