"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import type { RegistrationField } from "@/lib/schemas/event-registration.schema";

const TYPE_LABELS: Record<RegistrationField["type"], string> = {
  text: "Short answer",
  textarea: "Long answer",
  select: "Choice",
  checkbox: "Yes / no",
  date: "Date",
};

type Props = {
  value: RegistrationField[];
  onChange: (fields: RegistrationField[]) => void;
};

export function RegistrationQuestionsEditor({ value, onChange }: Props) {
  const update = (i: number, patch: Partial<RegistrationField>) =>
    onChange(value.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));

  return (
    <div className="space-y-3">
      <div>
        <Label>Extra questions</Label>
        <p className="text-sm text-muted-foreground">
          Name, contact, arrival, travel, food and allergies are already on the
          form. Add anything else here. Keep it short — every question is
          optional unless marked required.
        </p>
      </div>

      {value.map((field, i) => (
        <div key={field.id} className="space-y-3 rounded-md border p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]">
            <Input
              aria-label="Question"
              placeholder="e.g. T-shirt size"
              value={field.label}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <Select
              value={field.type}
              onValueChange={(type) =>
                update(i, { type: type as RegistrationField["type"] })
              }
            >
              <SelectTrigger aria-label="Answer type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={field.scope}
              onValueChange={(scope) =>
                update(i, { scope: scope as RegistrationField["scope"] })
              }
            >
              <SelectTrigger aria-label="Asked">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking">Once per booking</SelectItem>
                <SelectItem value="person">For each person</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove question"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {field.type === "select" && (
            <Input
              aria-label="Choices"
              placeholder="Choices, separated by commas — e.g. S, M, L, XL"
              defaultValue={field.options.join(", ")}
              onBlur={(e) =>
                update(i, {
                  options: e.target.value
                    .split(",")
                    .map((o) => o.trim())
                    .filter(Boolean),
                })
              }
            />
          )}

          <div className="flex items-center gap-2">
            <Switch
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(required) => update(i, { required })}
            />
            <Label htmlFor={`required-${field.id}`} className="font-normal">
              Required
            </Label>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...value,
            {
              id: crypto.randomUUID(),
              label: "",
              type: "text",
              options: [],
              required: false,
              scope: "booking",
            },
          ])
        }
      >
        <Plus className="mr-2 h-4 w-4" />
        Add question
      </Button>
    </div>
  );
}
