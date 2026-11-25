"use client";

import { useState } from "react";
import {
  AlignLeft,
  CalendarClock,
  CalendarDays,
  ChevronsUpDown,
  Clock,
  Copy,
  Eye,
  GripVertical,
  Hash,
  ListChecks,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  SquareCheck,
  ToggleRight,
  Trash2,
  Type,
  CalendarRange,
  Moon,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/animate-ui/components/radix/accordion";
import { Switch } from "@/app/components/animate-ui/components/radix/switch";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "@/app/components/ui/sortable";
import { Textarea } from "@/app/components/ui/textarea";
import { RegistrationFieldInput } from "@/app/components/registration-field";
import { cn } from "@/lib/utils";
import {
  DEFAULT_REGISTRATION_FIELDS,
  OPTION_FIELD_TYPES,
  isEventDayField,
  parseRegistrationFields,
  type AnswerValue,
  type RegistrationField,
  type RegistrationFieldType,
} from "@/lib/schemas/event-registration.schema";

const TYPES: Record<RegistrationFieldType, { label: string; icon: LucideIcon }> = {
  text: { label: "Short text", icon: Type },
  textarea: { label: "Long text", icon: AlignLeft },
  number: { label: "Number", icon: Hash },
  phone: { label: "Phone", icon: Phone },
  date: { label: "Date", icon: CalendarDays },
  time: { label: "Time", icon: Clock },
  datetime: { label: "Date & time", icon: CalendarClock },
  select: { label: "Dropdown (searchable)", icon: ChevronsUpDown },
  checkbox: { label: "Single checkbox", icon: SquareCheck },
  checkboxes: { label: "Checkboxes (pick many)", icon: ListChecks },
  switch: { label: "Switch (on / off)", icon: ToggleRight },
  location: { label: "Location (country, region, town)", icon: MapPin },
  days: { label: "Event days (from the dates)", icon: CalendarRange },
  nights: { label: "Event nights (from the dates)", icon: Moon },
};
const TYPE_KEYS = Object.keys(TYPES) as RegistrationFieldType[];
const HAS_PLACEHOLDER: RegistrationFieldType[] = [
  "text",
  "textarea",
  "number",
  "phone",
  "date",
  "select",
];

type Props = {
  value: RegistrationField[];
  onChange: (fields: RegistrationField[]) => void;
  otherForms: { id: string; title: string; registrationFields: unknown }[];
};

export function RegistrationFormBuilder({ value, onChange, otherForms }: Props) {
  const [openId, setOpenId] = useState("");
  const [preview, setPreview] = useState(false);
  // Bumped when the whole list is replaced (copy / reset) so per-field
  // editors with local state (options text) start fresh.
  const [version, setVersion] = useState(0);

  const replaceAll = (fields: RegistrationField[]) => {
    onChange(fields);
    setOpenId("");
    setVersion((v) => v + 1);
  };
  const update = (id: string, patch: Partial<RegistrationField>) =>
    onChange(value.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  function add(type: RegistrationFieldType) {
    const field: RegistrationField = {
      id: crypto.randomUUID(),
      label: "",
      type,
      options: OPTION_FIELD_TYPES.includes(type) && !isEventDayField({ type }) ? ["Option 1", "Option 2"] : [],
      required: false,
      scope: "booking",
      summary: OPTION_FIELD_TYPES.includes(type) || type === "location",
    };
    onChange([...value, field]);
    setOpenId(field.id);
  }

  function duplicate(f: RegistrationField) {
    const copy = { ...f, id: crypto.randomUUID(), label: `${f.label} (copy)` };
    const i = value.findIndex((x) => x.id === f.id);
    onChange([...value.slice(0, i + 1), copy, ...value.slice(i + 1)]);
    setOpenId(copy.id);
  }

  const copyable = otherForms.filter(
    (e) => parseRegistrationFields(e.registrationFields).length > 0,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Label>Registration form</Label>
          <p className="max-w-prose text-sm text-muted-foreground">
            The &ldquo;Who&apos;s coming&rdquo; section (name, gender, age group,
            relationship) is always included. Build everything else here. Drag
            to reorder.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPreview((p) => !p)}
        >
          {preview ? <Pencil className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {preview ? "Edit" : "Preview"}
        </Button>
      </div>

      {preview ? (
        <Preview fields={value} />
      ) : (
        <>
          {value.length === 0 && (
            <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No questions yet. Add one below, or start from the default form.
            </p>
          )}

          <Sortable
            value={value}
            onValueChange={onChange}
            getItemValue={(f) => f.id}
            orientation="vertical"
          >
            <Accordion
              key={version}
              type="single"
              collapsible
              value={openId}
              onValueChange={setOpenId}
            >
              <SortableContent className="space-y-2">
                {value.map((f) => (
                  <SortableItem key={f.id} value={f.id}>
                    <FieldCard
                      field={f}
                      onChange={(patch) => update(f.id, patch)}
                      onDuplicate={() => duplicate(f)}
                      onRemove={() => onChange(value.filter((x) => x.id !== f.id))}
                    />
                  </SortableItem>
                ))}
              </SortableContent>
            </Accordion>
            <SortableOverlay>
              {({ value: id }) => {
                const f = value.find((x) => x.id === id);
                return f ? (
                  <CardSummary
                    field={f}
                    className="rounded-lg border bg-background py-3 pr-4 pl-11 shadow-lg"
                  />
                ) : null;
              }}
            </SortableOverlay>
          </Sortable>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add question
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {TYPE_KEYS.map((t) => {
              const Icon = TYPES[t].icon;
              return (
                <DropdownMenuItem key={t} onSelect={() => add(t)}>
                  <Icon className="mr-2 h-4 w-4" />
                  {TYPES[t].label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {copyable.length > 0 && (
          <Select
            value=""
            onValueChange={(id) =>
              replaceAll(
                parseRegistrationFields(
                  copyable.find((e) => e.id === id)?.registrationFields,
                ),
              )
            }
          >
            <SelectTrigger size="sm" className="w-auto" aria-label="Copy form from another event">
              <Copy className="h-4 w-4" />
              <SelectValue placeholder="Copy form from…" />
            </SelectTrigger>
            <SelectContent>
              {copyable.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => replaceAll(DEFAULT_REGISTRATION_FIELDS)}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Use default form
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Copying or resetting replaces the questions above. Nothing is saved
        until you save the event.
      </p>
    </div>
  );
}

function CardSummary({
  field,
  className = "",
}: {
  field: RegistrationField;
  className?: string;
}) {
  const Icon = TYPES[field.type].icon;
  // Spans only: this renders inside the accordion's <button>.
  return (
    <span className={cn("flex min-w-0 flex-1 items-center gap-3 text-left", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium">
          {field.label || <span className="text-muted-foreground">Untitled question</span>}
        </span>
        <span className="truncate text-xs font-normal text-muted-foreground">
          {TYPES[field.type].label} ·{" "}
          {field.scope === "person" ? "For each person" : "Once per booking"}
        </span>
      </span>
      {field.required && field.type !== "switch" && (
        <Badge variant="secondary" className="ml-auto shrink-0">
          Required
        </Badge>
      )}
    </span>
  );
}

function FieldCard({
  field: f,
  onChange,
  onDuplicate,
  onRemove,
}: {
  field: RegistrationField;
  onChange: (patch: Partial<RegistrationField>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const id = (name: string) => `${f.id}-${name}`;

  function changeType(type: RegistrationFieldType) {
    const patch: Partial<RegistrationField> = { type };
    if (isEventDayField({ type })) patch.options = [];
    else if (OPTION_FIELD_TYPES.includes(type) && (f.options.length === 0 || isEventDayField(f))) {
      patch.options = ["Option 1", "Option 2"];
    }
    if (type === "switch") patch.required = false;
    onChange(patch);
  }

  return (
    <AccordionItem
      value={f.id}
      className="rounded-lg border bg-card transition-shadow last:border-b data-[state=open]:shadow-sm"
    >
      <div className="flex items-center gap-1 pr-2 pl-1">
        <SortableItemHandle
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 cursor-grab text-muted-foreground"
              aria-label="Drag to reorder"
            />
          }
        >
          <GripVertical className="size-4" />
        </SortableItemHandle>
        {/* The trigger's header wrapper isn't stretchable, so this div makes the row fill the width. */}
        <div className="min-w-0 flex-1">
          <AccordionTrigger className="items-center gap-3 py-3 hover:no-underline [&>svg]:translate-y-0">
            <CardSummary field={f} />
          </AccordionTrigger>
        </div>
        <div className="ml-1 flex shrink-0 items-center border-l pl-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            aria-label="Duplicate question"
            onClick={onDuplicate}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            aria-label="Delete question"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <AccordionContent className="space-y-4 border-t px-4 pt-4">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div className="space-y-2">
            <Label htmlFor={id("label")}>Question</Label>
            <Input
              id={id("label")}
              value={f.label}
              placeholder="e.g. T-shirt size"
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("type")}>Answer type</Label>
            <Select value={f.type} onValueChange={(t) => changeType(t as RegistrationFieldType)}>
              <SelectTrigger id={id("type")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_KEYS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TYPES[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={id("description")}>Help text (optional)</Label>
          <Input
            id={id("description")}
            value={f.description ?? ""}
            placeholder="Shown under the question"
            onChange={(e) => onChange({ description: e.target.value })}
          />
        </div>

        {HAS_PLACEHOLDER.includes(f.type) && (
          <div className="space-y-2">
            <Label htmlFor={id("placeholder")}>Placeholder (optional)</Label>
            <Input
              id={id("placeholder")}
              value={f.placeholder ?? ""}
              onChange={(e) => onChange({ placeholder: e.target.value })}
            />
          </div>
        )}

        {isEventDayField(f) && (
          <p className="text-sm text-muted-foreground">
            One option per {f.type === "days" ? "day" : "night"} of the event, filled in from its dates when you save.
            Guests on a booking answer this for themselves.
          </p>
        )}
        {OPTION_FIELD_TYPES.includes(f.type) && !isEventDayField(f) && (
          <OptionsEditor
            id={id("options")}
            options={f.options}
            onChange={(options) => onChange({ options })}
          />
        )}

        {f.type === "number" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(["min", "max"] as const).map((k) => (
              <div key={k} className="space-y-2">
                <Label htmlFor={id(k)}>{k === "min" ? "Minimum" : "Maximum"} (optional)</Label>
                <Input
                  id={id(k)}
                  type="number"
                  value={f[k] ?? ""}
                  onChange={(e) =>
                    onChange({ [k]: e.target.value === "" ? undefined : Number(e.target.value) })
                  }
                />
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={id("scope")}>Asked</Label>
            <Select
              value={f.scope}
              onValueChange={(scope) => onChange({ scope: scope as RegistrationField["scope"] })}
            >
              <SelectTrigger id={id("scope")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking">Once per booking</SelectItem>
                <SelectItem value="person">For each person</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col justify-end gap-3">
            {f.type !== "switch" && (
              <ToggleRow
                id={id("required")}
                label={f.type === "checkbox" ? "Required (must be ticked)" : "Required"}
                checked={f.required}
                onChange={(required) => onChange({ required })}
              />
            )}
            <ToggleRow
              id={id("summary")}
              label="Show in registrations summary"
              checked={f.summary}
              onChange={(summary) => onChange({ summary })}
            />
            <ToggleRow
              id={id("inPersonOnly")}
              label="Only ask in-person attendees"
              checked={!!f.inPersonOnly}
              onChange={(inPersonOnly) => onChange({ inPersonOnly })}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/** One option per line. Keeps the raw text so blank lines can be typed. */
function OptionsEditor({
  id,
  options,
  onChange,
}: {
  id: string;
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const [text, setText] = useState(options.join("\n"));
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Options, one per line</Label>
      <Textarea
        id={id}
        rows={Math.min(Math.max(options.length + 1, 3), 10)}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const lines = e.target.value.split("\n").map((l) => l.trim()).filter(Boolean);
          onChange([...new Set(lines)]);
        }}
      />
    </div>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

/** Live preview, using the exact renderer members see. */
function Preview({ fields }: { fields: RegistrationField[] }) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const groups = [
    { title: "Details (once per booking)", fields: fields.filter((f) => f.scope === "booking") },
    { title: "For each person", fields: fields.filter((f) => f.scope === "person") },
  ].filter((g) => g.fields.length);

  if (!groups.length) {
    return <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>;
  }
  return (
    <div className="space-y-6 rounded-md border bg-muted/20 p-4">
      {groups.map((g) => (
        <section key={g.title} className="space-y-5">
          <h3 className="text-sm font-semibold text-muted-foreground">{g.title}</h3>
          {g.fields.map((f) => (
            <RegistrationFieldInput
              key={f.id}
              id={`preview-${f.id}`}
              field={f}
              value={answers[f.id]}
              onChange={(v) => setAnswers((a) => ({ ...a, [f.id]: v }))}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
