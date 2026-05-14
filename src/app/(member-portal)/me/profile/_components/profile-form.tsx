"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  confirmMyProfile,
  updateMyProfile,
} from "@/actions/member-portal";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

type Gender = "MALE" | "FEMALE";
type MaritalStatus = "SINGLE" | "MARRIED" | "WIDOWED" | "DIVORCED";
type LifeStage = "WORKING_PROFESSIONAL" | "TERTIARY_STUDENT" | "SHS_STUDENT";
type RegionalChapter =
  | "GREATER_ACCRA"
  | "ASHANTI"
  | "DIASPORA"
  | "NORTHERN"
  | "CENTRAL_NORTH"
  | "CENTRAL_SOUTH"
  | "NORTH_EAST"
  | "BONO"
  | "EASTERN"
  | "WESTERN";
type ProfessionalTrack = "EMPLOYED" | "SELF_EMPLOYED" | "STUDYING_OVERSEAS";

export type MemberProfile = {
  preferredName: string | null;
  occupation: string | null;
  dob: string | null;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  phone: string | null;
  whatsapp: string | null;
  addressLine: string | null;
  city: string | null;
  countryId: string | null;
  regionId: string | null;
  region: string | null;
  country: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  lifeStage: LifeStage | null;
  regionalChapter: RegionalChapter | null;
  professionalTrack: ProfessionalTrack | null;
  organizationName: string | null;
};

type CountryOption = { id: string; name: string; code: string };
type RegionOption = { id: string; name: string; countryId: string };

const NONE = "__none__";
const GENDER_LABELS: Record<Gender, string> = {
  MALE: "Male",
  FEMALE: "Female",
};
const MARITAL_LABELS: Record<MaritalStatus, string> = {
  SINGLE: "Single",
  MARRIED: "Married",
  WIDOWED: "Widowed",
  DIVORCED: "Divorced",
};
const LIFE_STAGE_LABELS: Record<LifeStage, string> = {
  WORKING_PROFESSIONAL: "Working professional",
  TERTIARY_STUDENT: "Tertiary student",
  SHS_STUDENT: "SHS student",
};
const REGIONAL_CHAPTER_LABELS: Record<RegionalChapter, string> = {
  GREATER_ACCRA: "Greater Accra",
  ASHANTI: "Ashanti",
  DIASPORA: "Diaspora",
  NORTHERN: "Northern",
  CENTRAL_NORTH: "Central North",
  CENTRAL_SOUTH: "Central South",
  NORTH_EAST: "North East",
  BONO: "Bono",
  EASTERN: "Eastern",
  WESTERN: "Western",
};
const TRACK_LABELS: Record<ProfessionalTrack, string> = {
  EMPLOYED: "Employed",
  SELF_EMPLOYED: "Self-employed",
  STUDYING_OVERSEAS: "Studying overseas",
};

export function ProfileForm({
  member,
  countries,
  regions,
  needsConfirmation,
}: {
  member: MemberProfile;
  countries: CountryOption[];
  regions: RegionOption[];
  needsConfirmation: boolean;
}) {
  const [state, setState] = useState(member);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  const update = <K extends keyof MemberProfile>(
    key: K,
    value: MemberProfile[K],
  ) => setState((prev) => ({ ...prev, [key]: value }));

  const filteredRegions = useMemo(() => {
    if (!state.countryId) return regions;
    return regions.filter((r) => r.countryId === state.countryId);
  }, [regions, state.countryId]);

  const isProfessional = state.lifeStage === "WORKING_PROFESSIONAL";

  function buildPayload() {
    return {
      preferredName: state.preferredName,
      occupation: state.occupation,
      dob: state.dob,
      gender: state.gender,
      maritalStatus: state.maritalStatus,
      phone: state.phone,
      whatsapp: state.whatsapp,
      addressLine: state.addressLine,
      city: state.city,
      countryId: state.countryId,
      regionId: state.regionId,
      region: state.region,
      country: state.country,
      emergencyContactName: state.emergencyContactName,
      emergencyContactPhone: state.emergencyContactPhone,
      lifeStage: state.lifeStage,
      regionalChapter: state.regionalChapter,
      professionalTrack: isProfessional ? state.professionalTrack : null,
      organizationName: isProfessional ? state.organizationName : null,
    };
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      try {
        await updateMyProfile(buildPayload());
        setMessage({ type: "success", text: "Profile saved." });
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Profile update failed",
        });
      }
    });
  }

  function handleConfirm() {
    if (!confirmed) {
      setMessage({
        type: "error",
        text: "Please tick the confirmation checkbox to continue.",
      });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        await confirmMyProfile(buildPayload());
        setMessage({
          type: "success",
          text: "Thank you! Your details are confirmed.",
        });
      } catch (err) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Confirmation failed",
        });
      }
    });
  }

  return (
    <div className="space-y-6" aria-busy={isPending}>
      {message ? (
        <div
          className={
            message.type === "success"
              ? "rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900"
              : "rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900"
          }
        >
          {message.text}
        </div>
      ) : null}

      {/* Card 1 — About you */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About you</CardTitle>
          <CardDescription>How we address you and stay close.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldText
              label="Preferred name"
              value={state.preferredName}
              onChange={(v) => update("preferredName", v)}
            />
            <FieldText
              label="Occupation"
              value={state.occupation}
              onChange={(v) => update("occupation", v)}
            />
            <FieldDate
              label="Date of birth"
              value={state.dob}
              onChange={(v) => update("dob", v)}
            />
            <FieldSelect
              label="Gender"
              value={state.gender}
              onChange={(v) => update("gender", v as Gender | null)}
              options={Object.entries(GENDER_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <FieldSelect
              label="Marital status"
              value={state.maritalStatus}
              onChange={(v) =>
                update("maritalStatus", v as MaritalStatus | null)
              }
              options={Object.entries(MARITAL_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — Contact & address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact &amp; address</CardTitle>
          <CardDescription>Where to reach you.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldText
              label="Phone"
              value={state.phone}
              onChange={(v) => update("phone", v)}
            />
            <FieldText
              label="WhatsApp"
              value={state.whatsapp}
              onChange={(v) => update("whatsapp", v)}
            />
            <div className="sm:col-span-2">
              <FieldText
                label="Address"
                value={state.addressLine}
                onChange={(v) => update("addressLine", v)}
              />
            </div>
            <FieldText
              label="City"
              value={state.city}
              onChange={(v) => update("city", v)}
            />
            <FieldSelect
              label="Country"
              value={state.countryId}
              onChange={(v) => {
                update("countryId", v);
                // Clear region if it doesn't belong to the new country
                if (v && state.regionId) {
                  const stillValid = regions.find(
                    (r) => r.id === state.regionId && r.countryId === v,
                  );
                  if (!stillValid) update("regionId", null);
                }
              }}
              options={countries.map((c) => ({ value: c.id, label: c.name }))}
            />
            <FieldSelect
              label="Region"
              value={state.regionId}
              onChange={(v) => update("regionId", v)}
              options={filteredRegions.map((r) => ({
                value: r.id,
                label: r.name,
              }))}
              disabled={filteredRegions.length === 0}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 3 — PHANET profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PHANET profile</CardTitle>
          <CardDescription>
            Help us serve you better in the network.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldText
              label="Emergency contact name"
              value={state.emergencyContactName}
              onChange={(v) => update("emergencyContactName", v)}
            />
            <FieldText
              label="Emergency contact phone"
              value={state.emergencyContactPhone}
              onChange={(v) => update("emergencyContactPhone", v)}
            />
            <FieldSelect
              label="Life stage"
              value={state.lifeStage}
              onChange={(v) => update("lifeStage", v as LifeStage | null)}
              options={Object.entries(LIFE_STAGE_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
            <FieldSelect
              label="Regional chapter"
              value={state.regionalChapter}
              onChange={(v) =>
                update("regionalChapter", v as RegionalChapter | null)
              }
              options={Object.entries(REGIONAL_CHAPTER_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
            {isProfessional ? (
              <>
                <FieldSelect
                  label="Professional track"
                  value={state.professionalTrack}
                  onChange={(v) =>
                    update(
                      "professionalTrack",
                      v as ProfessionalTrack | null,
                    )
                  }
                  options={Object.entries(TRACK_LABELS).map(
                    ([value, label]) => ({ value, label }),
                  )}
                />
                <FieldText
                  label="Organisation"
                  value={state.organizationName}
                  onChange={(v) => update("organizationName", v)}
                />
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Action bar */}
      {needsConfirmation ? (
        <Card className="border-midnight-green/30">
          <CardContent className="space-y-4 pt-6">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-midnight-green/40 text-midnight-green focus:ring-midnight-green"
              />
              <span className="text-foreground">
                I confirm that the information above is accurate and up to date.
              </span>
            </label>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="bg-midnight-green text-white hover:bg-midnight-green/90"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Confirm my details
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                disabled={isPending}
              >
                Save without confirming
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save profile
          </Button>
        </div>
      )}
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      />
    </div>
  );
}

function FieldDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={value ?? NONE}
        onValueChange={(v) => onChange(v === NONE ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not set</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
