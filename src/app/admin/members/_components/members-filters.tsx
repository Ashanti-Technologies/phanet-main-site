"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

type Option = { id: string; name?: string; label?: string };

const STATUS_OPTIONS = [
  { value: "VISITOR", label: "Visitor" },
  { value: "PENDING_APPROVAL", label: "Pending approval" },
  { value: "REGULAR", label: "Regular" },
  { value: "MEMBER", label: "Member" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "DECEASED", label: "Deceased" },
];

const AGE_OPTIONS = [
  { value: "under18", label: "Under 18" },
  { value: "18-29", label: "18–29" },
  { value: "30-49", label: "30–49" },
  { value: "50-69", label: "50–69" },
  { value: "70plus", label: "70+" },
];

const ALL = "__all__";

export function MembersFilters({
  units,
  tags,
}: {
  units: Option[];
  tags: Option[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const initialQ = params.get("q") ?? "";
  // Reset local input when the URL's `q` changes (pagination, back button).
  const [q, setQ] = useState(initialQ);
  const [qSource, setQSource] = useState(initialQ);
  if (qSource !== initialQ) {
    setQSource(initialQ);
    setQ(initialQ);
  }

  function pushParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value || value === ALL) next.delete(key);
    else next.set(key, value);
    next.delete("page"); // reset to page 1 on any filter change
    startTransition(() => {
      router.push(`/admin/members?${next.toString()}`);
    });
  }

  function applySearch(value: string) {
    pushParam("q", value.trim() || null);
  }

  function clearAll() {
    setQ("");
    startTransition(() => router.push("/admin/members"));
  }

  const hasFilters =
    !!params.get("q") ||
    !!params.get("unitId") ||
    !!params.get("tagId") ||
    !!params.get("status") ||
    !!params.get("ageBucket");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        className="relative flex-1 min-w-[220px] max-w-sm"
        onSubmit={(e) => {
          e.preventDefault();
          applySearch(q);
        }}
      >
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => applySearch(q)}
          placeholder="Search name, phone, email…"
          className="pl-8 h-9"
        />
      </form>

      <Select
        value={params.get("unitId") ?? ALL}
        onValueChange={(v) => pushParam("unitId", v === ALL ? null : v)}
      >
        <SelectTrigger className="h-9 w-44">
          <SelectValue placeholder="Unit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All units</SelectItem>
          {units.map((u) => (
            <SelectItem key={u.id} value={u.id}>
              {u.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("tagId") ?? ALL}
        onValueChange={(v) => pushParam("tagId", v === ALL ? null : v)}
      >
        <SelectTrigger className="h-9 w-40">
          <SelectValue placeholder="Tag" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All tags</SelectItem>
          {tags.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("status") ?? ALL}
        onValueChange={(v) => pushParam("status", v === ALL ? null : v)}
      >
        <SelectTrigger className="h-9 w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("ageBucket") ?? ALL}
        onValueChange={(v) => pushParam("ageBucket", v === ALL ? null : v)}
      >
        <SelectTrigger className="h-9 w-36">
          <SelectValue placeholder="Age" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All ages</SelectItem>
          {AGE_OPTIONS.map((a) => (
            <SelectItem key={a.value} value={a.value}>
              {a.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5"
          onClick={clearAll}
          disabled={pending}
        >
          <X className="h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}
