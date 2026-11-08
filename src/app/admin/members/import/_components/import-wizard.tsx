"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  previewMemberImport,
  runMemberImport,
  type ImportRow,
} from "@/actions/member-import";
import { DataTable } from "@/app/components/data-table/data-table";
import {
  columnHelper,
  facetFilterFn,
} from "@/app/components/data-table/features";

type DuplicateRow = { id: string; row: number; reason: string; row_data: ImportRow };
const dup = columnHelper<DuplicateRow>();
const duplicateColumns = dup.columns([
  dup.accessor("row", {
    header: "Row",
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">{getValue()}</span>
    ),
  }),
  dup.accessor((d) => d.row_data.fullName ?? "", {
    id: "name",
    header: "Name",
    cell: ({ getValue }) => <span className="text-sm">{getValue()}</span>,
  }),
  dup.accessor((d) => d.row_data.email ?? d.row_data.phone ?? "", {
    id: "contact",
    header: "Email/Phone",
    cell: ({ getValue }) => <span className="text-xs">{getValue() || "—"}</span>,
  }),
  dup.accessor("reason", {
    header: "Reason",
    filterFn: facetFilterFn,
    cell: ({ getValue }) => (
      <span className="text-xs text-amber-700 dark:text-amber-400">{getValue()}</span>
    ),
  }),
]);

const TARGET_FIELDS = [
  { value: "fullName", label: "Full name *" },
  { value: "preferredName", label: "Preferred name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "dob", label: "Date of birth" },
  { value: "gender", label: "Gender" },
  { value: "maritalStatus", label: "Marital status" },
  { value: "addressLine", label: "Address" },
  { value: "city", label: "City" },
  { value: "region", label: "Region" },
  { value: "country", label: "Country" },
  { value: "occupation", label: "Occupation" },
  { value: "joinDate", label: "Join date" },
  { value: "status", label: "Status" },
  { value: "unitName", label: "Church unit (by name)" },
] as const;

type Target = (typeof TARGET_FIELDS)[number]["value"];
const SKIP: Target | "__skip__" = "__skip__";

function autoMap(header: string): Target | "__skip__" {
  const h = header.toLowerCase().replace(/[^a-z]/g, "");
  if (h.includes("fullname") || h === "name") return "fullName";
  if (h.includes("preferred") || h === "nickname") return "preferredName";
  if (h.includes("email") || h.includes("mail")) return "email";
  if (h.includes("whatsapp") || h === "wa") return "whatsapp";
  if (h.includes("phone") || h === "mobile" || h === "tel") return "phone";
  if (h === "dob" || h.includes("birth")) return "dob";
  if (h.includes("gender") || h === "sex") return "gender";
  if (h.includes("marital")) return "maritalStatus";
  if (h.includes("address")) return "addressLine";
  if (h === "city" || h === "town") return "city";
  if (h.includes("region") || h === "state") return "region";
  if (h.includes("country")) return "country";
  if (h.includes("occupation") || h === "job") return "occupation";
  if (h.includes("join")) return "joinDate";
  if (h === "status") return "status";
  if (h.includes("unit") || h.includes("ministry") || h.includes("group"))
    return "unitName";
  return SKIP;
}

type Step = "upload" | "map" | "preview" | "done";

export function ImportWizard() {
  const [step, setStep] = useState<Step>("upload");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, Target | "__skip__">>({});

  const [preview, setPreview] = useState<{
    total: number;
    importable: number;
    duplicates: number;
    sampleDuplicates: { row: number; reason: string; row_data: ImportRow }[];
  } | null>(null);

  const [result, setResult] = useState<{
    total: number;
    created: number;
    skipped: number;
    failed: number;
  } | null>(null);

  function handleFile(file: File) {
    setError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parse warning: ${results.errors[0].message}`);
        }
        const fields = (results.meta.fields ?? []).filter(Boolean) as string[];
        setHeaders(fields);
        setRows(results.data);
        const m: Record<string, Target | "__skip__"> = {};
        for (const h of fields) m[h] = autoMap(h);
        setMapping(m);
        setStep("map");
      },
      error: (err) => setError(err.message),
    });
  }

  function mappedRows(): ImportRow[] {
    return rows.map((raw) => {
      const out: Record<string, string | undefined> = {};
      for (const [header, target] of Object.entries(mapping)) {
        if (target === SKIP) continue;
        const v = raw[header]?.toString().trim();
        if (v) out[target] = v;
      }
      return {
        fullName: out.fullName ?? "",
        preferredName: out.preferredName ?? null,
        email: out.email ?? null,
        phone: out.phone ?? null,
        whatsapp: out.whatsapp ?? null,
        dob: out.dob ?? null,
        gender: out.gender ?? null,
        maritalStatus: out.maritalStatus ?? null,
        addressLine: out.addressLine ?? null,
        city: out.city ?? null,
        region: out.region ?? null,
        country: out.country ?? null,
        occupation: out.occupation ?? null,
        joinDate: out.joinDate ?? null,
        status: out.status ?? null,
        unitName: out.unitName ?? null,
      };
    }).filter((r) => r.fullName.length > 0);
  }

  function runPreview() {
    const data = mappedRows();
    if (data.length === 0) {
      setError("No rows have a full name mapped. Map a Full name column.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const p = await previewMemberImport(data);
        setPreview(p);
        setStep("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Preview failed");
      }
    });
  }

  function commit() {
    const data = mappedRows();
    setError(null);
    startTransition(async () => {
      try {
        const job = await runMemberImport(data);
        setResult({
          total: job.total,
          created: job.created,
          skipped: job.skipped,
          failed: job.failed,
        });
        setStep("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {step === "upload" && (
        <div className="space-y-3">
          <Label htmlFor="csv">CSV file</Label>
          <Input
            id="csv"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <p className="text-xs text-muted-foreground">
            The first row should contain column headers. Names must include a
            Full name. Duplicates are skipped by email or phone.
          </p>
        </div>
      )}

      {step === "map" && (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">
              Map columns ({rows.length.toLocaleString()} rows)
            </p>
            <p className="text-xs text-muted-foreground">
              Pick which Member field each CSV column maps to. Auto-suggestions
              applied — adjust as needed.
            </p>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CSV column</TableHead>
                  <TableHead>Sample value</TableHead>
                  <TableHead>Maps to</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headers.map((h) => (
                  <TableRow key={h}>
                    <TableCell className="font-medium text-sm">{h}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                      {rows[0]?.[h] ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping[h] ?? SKIP}
                        onValueChange={(v) =>
                          setMapping({ ...mapping, [h]: v as Target | "__skip__" })
                        }
                      >
                        <SelectTrigger className="h-8 w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SKIP}>— Skip —</SelectItem>
                          {TARGET_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("upload")}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Button onClick={runPreview} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Preview duplicates <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-sm py-1 px-3">
              Total: {preview.total}
            </Badge>
            <Badge
              variant="outline"
              className="text-sm py-1 px-3 text-emerald-700 border-emerald-500/40 dark:text-emerald-300"
            >
              Will import: {preview.importable}
            </Badge>
            <Badge
              variant="outline"
              className="text-sm py-1 px-3 text-amber-700 border-amber-500/40 dark:text-amber-300"
            >
              Skipped (duplicate): {preview.duplicates}
            </Badge>
          </div>

          {preview.sampleDuplicates.length > 0 && (
            <DataTable
              columns={duplicateColumns}
              data={preview.sampleDuplicates.map((d) => ({ id: String(d.row), ...d }))}
              searchPlaceholder="Search duplicates…"
              filters={[
                {
                  id: "reason",
                  title: "Reason",
                  options: [...new Set(preview.sampleDuplicates.map((d) => d.reason))].map(
                    (r) => ({ value: r, label: r }),
                  ),
                },
              ]}
            />
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("map")}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to mapping
            </Button>
            <Button onClick={commit} disabled={pending || preview.importable === 0}>
              {pending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <Upload className="h-4 w-4 mr-1.5" /> Import {preview.importable}{" "}
              members
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <h3 className="text-lg font-semibold">Import finished</h3>
          <div className="flex justify-center gap-6 text-sm">
            <Stat label="Created" value={result.created} tone="emerald" />
            <Stat label="Skipped" value={result.skipped} tone="amber" />
            <Stat label="Failed" value={result.failed} tone="rose" />
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <Button variant="outline" onClick={() => location.reload()}>
              Import another file
            </Button>
            <Button onClick={() => (window.location.href = "/admin/members")}>
              Go to directory
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "1. Upload" },
    { key: "map", label: "2. Map" },
    { key: "preview", label: "3. Preview" },
    { key: "done", label: "4. Done" },
  ];
  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => {
        const active = s.key === step;
        const done =
          steps.findIndex((x) => x.key === step) >
          steps.findIndex((x) => x.key === s.key);
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className={
                active
                  ? "font-semibold text-foreground"
                  : done
                    ? "text-muted-foreground line-through"
                    : "text-muted-foreground"
              }
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="text-muted-foreground/50">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-300"
        : "text-rose-700 dark:text-rose-300";
  return (
    <div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
