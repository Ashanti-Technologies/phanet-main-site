"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Eye, Users } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { Switch } from "@/app/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
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
  const bodyRef = useRef<HTMLTextAreaElement>(null);

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

  const VARIABLES = ["firstName", "fullName", "unitName"];
  const audienceCount = preview?.count ?? null;

  function insertVariable(v: string) {
    const el = bodyRef.current;
    const token = `{{${v}}}`;
    if (!el) return setBody((b) => b + token);
    const { selectionStart: a, selectionEnd: b } = el;
    setBody(body.slice(0, a) + token + body.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + token.length, a + token.length);
    });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Message</CardTitle>
          <CardDescription>What people will receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={channel}
                onValueChange={(v) => {
                  setChannel(v as Channel);
                  setTemplateId(NONE);
                  setPreview(null);
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
            <div className="space-y-2">
              <Label>Start from a template</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Write from scratch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Write from scratch</SelectItem>
                  {filteredTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {channel === "EMAIL" && (
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="body">Message *</Label>
            <Textarea
              id="body"
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={channel === "EMAIL" ? "min-h-72" : "min-h-36"}
              required
            />
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>Insert:</span>
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono hover:bg-muted"
                >
                  {`{{${v}}}`}
                </button>
              ))}
              {channel === "SMS" && <span className="ml-auto tabular-nums">{body.length} characters</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Internal name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Easter Sunday reminder"
            />
            <p className="text-xs text-muted-foreground">Only admins see this, in the batch history.</p>
          </div>

          {sampleVars && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-4">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> Preview for {sampleVars.fullName}
              </p>
              {channel === "EMAIL" && (
                <p className="text-sm font-semibold">{renderClient(subject, sampleVars)}</p>
              )}
              <div
                className="prose prose-sm max-w-none text-sm dark:prose-invert"
                dangerouslySetInnerHTML={{
                  __html:
                    channel === "EMAIL"
                      ? renderClient(body, sampleVars)
                      : escapeHtml(renderClient(body, sampleVars)),
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audience + send */}
      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle className="text-base">Audience</CardTitle>
          <CardDescription>Leave a filter on “All” to include everyone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Unit</Label>
            <Select value={unitId} onValueChange={(v) => { setUnitId(v); setPreview(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="All units" />
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
          <div className="space-y-2">
            <Label>Tag</Label>
            <Select value={tagId} onValueChange={(v) => { setTagId(v); setPreview(null); }}>
              <SelectTrigger>
                <SelectValue placeholder="All tags" />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status || NONE}
                onValueChange={(v) => { setStatus(v === NONE ? "" : (v as Status)); setPreview(null); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All</SelectItem>
                  <SelectItem value="VISITOR">Visitor</SelectItem>
                  <SelectItem value="REGULAR">Regular</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Select
                value={ageBucket || NONE}
                onValueChange={(v) => { setAgeBucket(v === NONE ? "" : (v as AgeBucket)); setPreview(null); }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All</SelectItem>
                  <SelectItem value="under18">Under 18</SelectItem>
                  <SelectItem value="18-29">18–29</SelectItem>
                  <SelectItem value="30-49">30–49</SelectItem>
                  <SelectItem value="50-69">50–69</SelectItem>
                  <SelectItem value="70plus">70+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center justify-between gap-3 text-sm">
            Skip people who opted out of {channel === "EMAIL" ? "emails" : "SMS"}
            <Switch
              checked={respectPreferences}
              onCheckedChange={(v) => { setRespectPreferences(v); setPreview(null); }}
            />
          </label>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {audienceCount === null ? "—" : audienceCount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {audienceCount === null ? "Check who this reaches" : `recipient${audienceCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={runPreview} disabled={pending}>
                {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Users className="mr-1.5 h-4 w-4" />}
                {preview ? "Recheck" : "Check recipients"}
              </Button>
            </div>
            {preview && preview.sample.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
                {preview.sample.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span className="truncate">{s.preferredName ?? s.fullName}</span>
                    <span className="truncate text-muted-foreground">{channel === "EMAIL" ? s.email : s.phone}</span>
                  </li>
                ))}
              </ul>
            )}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button className="w-full" onClick={send} disabled={pending || !preview || preview.count === 0}>
              {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              {preview?.count ? `Send to ${preview.count.toLocaleString()}` : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
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
