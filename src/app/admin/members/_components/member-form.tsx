"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
import { CloudinaryImageField } from "@/app/admin/_components/cloudinary-image-field";
import { createMember, updateMember } from "@/actions/members";
import { PROFILE_PICS_FOLDER } from "@/constants";

const NO_HOUSEHOLD = "__none__";

type Option = { id: string; name?: string | null; label?: string | null };

export type MemberFormValues = {
  id?: string;
  fullName: string;
  preferredName: string;
  dob: string;
  gender: "" | "MALE" | "FEMALE";
  maritalStatus: "" | "SINGLE" | "MARRIED" | "WIDOWED" | "DIVORCED";
  email: string;
  phone: string;
  whatsapp: string;
  addressLine: string;
  city: string;
  region: string;
  country: string;
  occupation: string;
  photoUrl: string;
  photoPublicId: string;
  salvationDate: string;
  baptismDate: string;
  weddingAnniversary: string;
  joinDate: string;
  status:
  | "VISITOR"
  | "PENDING_APPROVAL"
  | "REGULAR"
  | "MEMBER"
  | "INACTIVE"
  | "TRANSFERRED"
  | "DECEASED";
  notes: string;
  notifyByEmail: boolean;
  notifyBySms: boolean;
  householdId: string;
  unitIds: string[];
  tagIds: string[];
};

export const emptyMemberValues: MemberFormValues = {
  fullName: "",
  preferredName: "",
  dob: "",
  gender: "",
  maritalStatus: "",
  email: "",
  phone: "",
  whatsapp: "",
  addressLine: "",
  city: "",
  region: "",
  country: "Ghana",
  occupation: "",
  photoUrl: "",
  photoPublicId: "",
  salvationDate: "",
  baptismDate: "",
  weddingAnniversary: "",
  joinDate: "",
  status: "VISITOR",
  notes: "",
  notifyByEmail: true,
  notifyBySms: true,
  householdId: "",
  unitIds: [],
  tagIds: [],
};

export function MemberForm({
  initial,
  units,
  tags,
  households,
}: {
  initial: MemberFormValues;
  units: Option[];
  tags: Option[];
  households: Option[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<MemberFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSet(key: "unitIds" | "tagIds", id: string) {
    setValues((prev) => {
      const has = prev[key].includes(id);
      return {
        ...prev,
        [key]: has ? prev[key].filter((x) => x !== id) : [...prev[key], id],
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      ...values,
      gender: values.gender || null,
      maritalStatus: values.maritalStatus || null,
      householdId:
        values.householdId && values.householdId !== NO_HOUSEHOLD
          ? values.householdId
          : null,
      dob: values.dob || null,
      salvationDate: values.salvationDate || null,
      baptismDate: values.baptismDate || null,
      weddingAnniversary: values.weddingAnniversary || null,
      joinDate: values.joinDate || null,
    };
    startTransition(async () => {
      try {
        if (values.id) {
          await updateMember({ ...payload, id: values.id } as never);
          router.push(`/admin/members/${values.id}`);
        } else {
          const res = await createMember(payload as never);
          router.push(`/admin/members/${res.data.id}`);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save member");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Section title="Photo">
        <CloudinaryImageField
          value={{
            url: values.photoUrl || undefined,
            publicId: values.photoPublicId || undefined,
            alt: values.fullName,
          }}
          onChange={(v) => {
            set("photoUrl", v.url ?? "");
            set("photoPublicId", v.publicId ?? "");
          }}
          ownerType="member"
          ownerId={values.id}
          folder={PROFILE_PICS_FOLDER}
        />
      </Section>

      <Section title="Basics">
        <Grid>
          <Field label="Full name" required>
            <Input
              value={values.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              required
            />
          </Field>
          <Field label="Preferred name">
            <Input
              value={values.preferredName}
              onChange={(e) => set("preferredName", e.target.value)}
            />
          </Field>
          <Field label="Date of birth">
            <Input
              type="date"
              value={values.dob}
              onChange={(e) => set("dob", e.target.value)}
            />
          </Field>
          <Field label="Gender">
            <Select
              value={values.gender || "__none__"}
              onValueChange={(v) =>
                set("gender", v === "__none__" ? "" : (v as "MALE" | "FEMALE"))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Marital status">
            <Select
              value={values.maritalStatus || "__none__"}
              onValueChange={(v) =>
                set(
                  "maritalStatus",
                  v === "__none__"
                    ? ""
                    : (v as "SINGLE" | "MARRIED" | "WIDOWED" | "DIVORCED"),
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">—</SelectItem>
                <SelectItem value="SINGLE">Single</SelectItem>
                <SelectItem value="MARRIED">Married</SelectItem>
                <SelectItem value="WIDOWED">Widowed</SelectItem>
                <SelectItem value="DIVORCED">Divorced</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Occupation">
            <Input
              value={values.occupation}
              onChange={(e) => set("occupation", e.target.value)}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Contact">
        <Grid>
          <Field label="Email">
            <Input
              type="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={values.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
            />
          </Field>
          <Field label="Address">
            <Input
              value={values.addressLine}
              onChange={(e) => set("addressLine", e.target.value)}
            />
          </Field>
          <Field label="City">
            <Input
              value={values.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Field>
          <Field label="Region">
            <Input
              value={values.region}
              onChange={(e) => set("region", e.target.value)}
            />
          </Field>
          <Field label="Country">
            <Input
              value={values.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Faith milestones">
        <Grid>
          <Field label="Salvation date">
            <Input
              type="date"
              value={values.salvationDate}
              onChange={(e) => set("salvationDate", e.target.value)}
            />
          </Field>
          <Field label="Baptism date">
            <Input
              type="date"
              value={values.baptismDate}
              onChange={(e) => set("baptismDate", e.target.value)}
            />
          </Field>
          <Field label="Wedding anniversary">
            <Input
              type="date"
              value={values.weddingAnniversary}
              onChange={(e) => set("weddingAnniversary", e.target.value)}
            />
          </Field>
          <Field label="Join date">
            <Input
              type="date"
              value={values.joinDate}
              onChange={(e) => set("joinDate", e.target.value)}
            />
          </Field>
        </Grid>
      </Section>

      <Section title="Status & household">
        <Grid>
          <Field label="Status">
            <Select
              value={values.status}
              onValueChange={(v) =>
                set("status", v as MemberFormValues["status"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VISITOR">Visitor</SelectItem>
                <SelectItem value="PENDING_APPROVAL">
                  Pending approval
                </SelectItem>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="MEMBER">Member</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                <SelectItem value="DECEASED">Deceased</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Household">
            <Select
              value={values.householdId || NO_HOUSEHOLD}
              onValueChange={(v) =>
                set("householdId", v === NO_HOUSEHOLD ? "" : v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_HOUSEHOLD}>—</SelectItem>
                {households.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Grid>
      </Section>

      <Section title="Church units">
        {units.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No active church units. Create some in Settings → Church Units.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {units.map((u) => {
              const on = values.unitIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleSet("unitIds", u.id)}
                  className="cursor-pointer"
                >
                  <Badge
                    variant={on ? "default" : "outline"}
                    className="text-sm py-1 px-3"
                  >
                    {u.name}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Tags">
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No tags yet. Create some in Settings → Tags.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const on = values.tagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleSet("tagIds", t.id)}
                  className="cursor-pointer"
                >
                  <Badge
                    variant={on ? "default" : "outline"}
                    className="text-sm py-1 px-3"
                  >
                    {t.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Notes (admin only)">
        <Textarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={4}
          placeholder="Pastoral note, prayer focus, anything not in other fields…"
        />
      </Section>

      <Section title="Notifications">
        <div className="space-y-3">
          <ToggleRow
            label="Send email notifications"
            checked={values.notifyByEmail}
            onChange={(v) => set("notifyByEmail", v)}
          />
          <ToggleRow
            label="Send SMS notifications"
            checked={values.notifyBySms}
            onChange={(v) => set("notifyBySms", v)}
          />
        </div>
      </Section>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
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
          {values.id ? "Save changes" : "Create member"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <Label className="text-sm font-medium">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
