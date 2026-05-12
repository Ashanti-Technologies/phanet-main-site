"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
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
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/actions/messages";

export type TemplateFormValues = {
  id?: string;
  name: string;
  channel: "EMAIL" | "SMS";
  subject: string;
  body: string;
};

export function TemplateForm({ initial }: { initial: TemplateFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);

  function set<K extends keyof TemplateFormValues>(
    key: K,
    value: TemplateFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name: values.name,
      channel: values.channel,
      subject: values.subject || null,
      body: values.body,
      variables: extractVars(values.body, values.subject),
    };
    startTransition(async () => {
      try {
        if (values.id) {
          await updateTemplate({ ...payload, id: values.id } as never);
        } else {
          await createTemplate(payload as never);
        }
        router.push("/admin/messages/templates");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  async function handleDelete() {
    if (!values.id) return;
    if (!confirm("Delete this template?")) return;
    setDeleting(true);
    try {
      await deleteTemplate(values.id);
      router.push("/admin/messages/templates");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Name *</Label>
          <Input
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Channel *</Label>
          <Select
            value={values.channel}
            onValueChange={(v) => set("channel", v as "EMAIL" | "SMS")}
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
      </div>

      {values.channel === "EMAIL" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Subject *</Label>
          <Input
            value={values.subject}
            onChange={(e) => set("subject", e.target.value)}
            required
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs">
          Body * — supports {"{{firstName}}"}, {"{{fullName}}"},{" "}
          {"{{unitName}}"}
        </Label>
        <Textarea
          value={values.body}
          onChange={(e) => set("body", e.target.value)}
          rows={values.channel === "EMAIL" ? 12 : 6}
          placeholder={
            values.channel === "EMAIL"
              ? "<p>Hello {{firstName}},</p>"
              : "Hi {{firstName}}, your reminder…"
          }
          required
        />
        {values.channel === "EMAIL" && (
          <p className="text-xs text-muted-foreground">
            Email body is sent as HTML.
          </p>
        )}
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
            {values.id ? "Save changes" : "Create template"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function extractVars(...sources: string[]): string[] {
  const out = new Set<string>();
  const rx = /\{\{\s*([\w.]+)\s*\}\}/g;
  for (const src of sources) {
    let m;
    while ((m = rx.exec(src ?? "")) !== null) out.add(m[1]);
  }
  return Array.from(out);
}
