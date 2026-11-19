"use client";

import { DateField } from "@/app/components/date-field";
import { Checkbox } from "@/app/components/animate-ui/components/radix/checkbox";
import { Switch } from "@/app/components/animate-ui/components/radix/switch";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/app/components/ui/combobox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import type {
  AnswerValue,
  RegistrationField,
} from "@/lib/schemas/event-registration.schema";

type Props = {
  field: RegistrationField;
  /** Unique per rendered instance (a field can appear once per person). */
  id: string;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  error?: string;
};

/**
 * Renders one form-builder field. Used by the public registration form and
 * the admin builder's preview, so what admins see is what members get.
 */
export function RegistrationFieldInput({ field, id, value, onChange, error }: Props) {
  const label = (
    <>
      {field.label}
      {field.required && field.type !== "switch" && (
        <span aria-hidden className="text-destructive">
          *
        </span>
      )}
    </>
  );
  const description = field.description ? (
    <FieldDescription>{field.description}</FieldDescription>
  ) : null;
  const invalid = !!error || undefined;

  if (field.type === "checkbox" || field.type === "switch") {
    const Control = field.type === "checkbox" ? Checkbox : Switch;
    return (
      <Field orientation="horizontal" data-invalid={invalid} data-field-id={id}>
        <Control
          id={id}
          checked={value === true}
          onCheckedChange={(v) => onChange(v === true)}
          aria-required={field.required || undefined}
          aria-invalid={invalid}
        />
        <FieldContent>
          <FieldLabel htmlFor={id} className="font-normal">
            {label}
          </FieldLabel>
          {description}
          <FieldError>{error}</FieldError>
        </FieldContent>
      </Field>
    );
  }

  if (field.type === "checkboxes") {
    const picked = Array.isArray(value) ? value : [];
    return (
      <FieldSet data-invalid={invalid} data-field-id={id} className="gap-3">
        <FieldLegend variant="label" className="mb-0">
          {label}
        </FieldLegend>
        {description}
        <div className="grid gap-2 sm:grid-cols-2">
          {field.options.map((o, i) => (
            <Field key={o} orientation="horizontal">
              <Checkbox
                id={`${id}-${i}`}
                checked={picked.includes(o)}
                onCheckedChange={(v) =>
                  onChange(v === true ? [...picked, o] : picked.filter((p) => p !== o))
                }
              />
              <FieldLabel htmlFor={`${id}-${i}`} className="font-normal">
                {o}
              </FieldLabel>
            </Field>
          ))}
        </div>
        <FieldError>{error}</FieldError>
      </FieldSet>
    );
  }

  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const common = {
    id,
    "aria-required": field.required || undefined,
    "aria-invalid": invalid,
  };

  let control: React.ReactNode;
  switch (field.type) {
    case "textarea":
      control = (
        <Textarea
          {...common}
          rows={3}
          placeholder={field.placeholder}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "select":
      control = (
        <Combobox
          items={field.options}
          value={text || null}
          onValueChange={(v) => onChange(typeof v === "string" ? v : "")}
        >
          <ComboboxInput
            {...common}
            className="h-12 w-full"
            placeholder={field.placeholder || "Search or select"}
            showClear={!!text}
          />
          <ComboboxContent>
            <ComboboxEmpty>No matches.</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      );
      break;
    case "date":
      control = (
        <DateField
          value={text || null}
          onChange={(v) => onChange(v ?? "")}
          placeholder={field.placeholder || "Pick a date"}
          fromYear={1925}
          toYear={new Date().getFullYear() + 5}
          defaultMonth={new Date()}
        />
      );
      break;
    case "datetime": {
      const [date = "", time = ""] = text.split("T");
      const join = (d: string, t: string) => onChange(d || t ? `${d}T${t}` : "");
      control = (
        <div className="grid grid-cols-[1fr_9rem] gap-2">
          <DateField
            value={date || null}
            onChange={(d) => join(d ?? "", time)}
            fromYear={new Date().getFullYear() - 1}
            toYear={new Date().getFullYear() + 5}
            defaultMonth={new Date()}
          />
          <Input
            {...common}
            type="time"
            aria-label={`${field.label} time`}
            value={time}
            onChange={(e) => join(date, e.target.value)}
          />
        </div>
      );
      break;
    }
    default:
      control = (
        <Input
          {...common}
          type={INPUT_TYPES[field.type] ?? "text"}
          inputMode={field.type === "number" ? "decimal" : undefined}
          autoComplete={field.type === "phone" ? "tel" : undefined}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={text}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }

  return (
    <Field data-invalid={invalid} data-field-id={id}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {control}
      {description}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

const INPUT_TYPES: Partial<Record<RegistrationField["type"], string>> = {
  number: "number",
  phone: "tel",
  time: "time",
};
