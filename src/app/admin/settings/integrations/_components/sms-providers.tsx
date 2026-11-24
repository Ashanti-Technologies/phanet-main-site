"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Send } from "lucide-react";
import { saveSmsProviders, sendTestSms } from "@/actions/integrations";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";

export type SmsProviderRow = {
  key: "arkesel" | "hubtel";
  label: string;
  enabled: boolean;
  configured: boolean;
  balance: { label: string; low: boolean } | null;
};

export function SmsProviders({ initial }: { initial: SmsProviderRow[] }) {
  const [rows, setRows] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  function update(next: SmsProviderRow[]) {
    setRows(next);
    setDirty(true);
  }

  function move(i: number, by: -1 | 1) {
    const next = [...rows];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    update(next);
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      await saveSmsProviders(rows.map(({ key, enabled }) => ({ key, enabled })));
      setDirty(false);
      setNotice({ ok: true, text: "Saved." });
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  }

  async function test(row: SmsProviderRow) {
    setTesting(row.key);
    setNotice(null);
    try {
      const res = await sendTestSms({ provider: row.key, phone });
      setNotice(
        res.ok
          ? { ok: true, text: `${row.label} accepted the test message.` }
          : { ok: false, text: `${row.label}: ${res.error}` },
      );
    } catch (err) {
      setNotice({ ok: false, text: err instanceof Error ? err.message : "Test failed" });
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="space-y-4">
      <ol className="divide-y rounded-md border">
        {rows.map((row, i) => (
          <li key={row.key} className="flex flex-wrap items-center gap-3 p-3">
            <span className="w-6 text-sm text-muted-foreground">{i + 1}.</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{row.label}</span>
                {row.configured ? (
                  <Badge variant="secondary">Configured</Badge>
                ) : (
                  <Badge variant="destructive">Missing API keys</Badge>
                )}
                {row.balance?.low && <Badge variant="destructive">Low credit</Badge>}
              </div>
              {row.balance && (
                <p className="text-xs text-muted-foreground">{row.balance.label}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${row.label} up`}
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Move ${row.label} down`}
                disabled={i === rows.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Switch
                aria-label={`Use ${row.label}`}
                checked={row.enabled}
                onCheckedChange={(enabled) =>
                  update(rows.map((r) => (r.key === row.key ? { ...r, enabled } : r)))
                }
              />
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                disabled={!row.configured || !phone.trim() || testing !== null}
                onClick={() => test(row)}
              >
                {testing === row.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Test
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          type="tel"
          placeholder="Phone for test SMS (e.g. 024…)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Button className="ml-auto" onClick={save} disabled={!dirty || saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save order
        </Button>
      </div>

      {notice && (
        <p
          role="status"
          className={
            notice.ok
              ? "text-sm text-muted-foreground"
              : "rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          }
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}
