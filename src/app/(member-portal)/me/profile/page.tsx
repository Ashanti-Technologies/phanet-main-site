import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  MapPin,
  Pencil,
  type LucideIcon,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  computeProfileCompleteness,
  getCurrentMemberOrRedirect,
} from "@/lib/member-portal";
import { formatDateMedium } from "@/lib/format";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { LiquidButton } from "@/app/components/animate-ui/components/buttons/liquid";
import { Progress } from "@/app/components/ui/progress";
import { AdminViewCard } from "./_components/admin-view-card";
import {
  GENDER_LABELS,
  LIFE_STAGE_LABELS,
  MARITAL_LABELS,
  REGIONAL_CHAPTER_LABELS,
  TRACK_LABELS,
} from "./_components/profile-labels";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function MemberProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ claimed?: string }>;
}) {
  const { member } = await getCurrentMemberOrRedirect();
  const params = (await searchParams) ?? {};
  const justClaimed = params.claimed === "1";
  const needsConfirmation = !member.phanetProfile?.formSubmittedAt;
  const completeness = computeProfileCompleteness(member);
  const p = member.phanetProfile;

  const displayName = member.preferredName || member.fullName;
  const location = [
    member.city,
    member.regionRef?.name ?? member.region,
    member.countryRef?.name ?? member.country,
  ]
    .filter(Boolean)
    .join(", ");

  const sections: Array<{
    title: string;
    icon: LucideIcon;
    items: Array<[label: string, value: string | null | undefined]>;
  }> = [
    {
      title: "About you",
      icon: UserRound,
      items: [
        ["Full name", member.fullName],
        ["Preferred name", member.preferredName],
        ["Date of birth", member.dob ? formatDateMedium(member.dob) : null],
        ["Gender", member.gender ? GENDER_LABELS[member.gender] : null],
        [
          "Marital status",
          member.maritalStatus ? MARITAL_LABELS[member.maritalStatus] : null,
        ],
        ["Occupation", member.occupation],
      ],
    },
    {
      title: "Contact & address",
      icon: Phone,
      items: [
        ["Email", member.email],
        ["Phone", member.phone],
        ["WhatsApp", member.whatsapp],
        ["Address", member.addressLine],
        ["Location", location],
      ],
    },
    {
      title: "PHANET profile",
      icon: Sparkles,
      items: [
        ["Life stage", p?.lifeStage ? LIFE_STAGE_LABELS[p.lifeStage] : null],
        [
          "Regional chapter",
          p?.regionalChapter ? REGIONAL_CHAPTER_LABELS[p.regionalChapter] : null,
        ],
        ...(p?.lifeStage === "WORKING_PROFESSIONAL"
          ? ([
              [
                "Professional track",
                p.professionalTrack ? TRACK_LABELS[p.professionalTrack] : null,
              ],
              ["Organisation", p.organizationName],
            ] as Array<[string, string | null]>)
          : []),
        ["Emergency contact", p?.emergencyContactName],
        ["Emergency phone", p?.emergencyContactPhone],
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {justClaimed || needsConfirmation ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-mikado-yellow/50 bg-mikado-yellow/10 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-mikado-yellow/30 p-1.5">
              <CheckCircle2 className="h-4 w-4 text-midnight-green" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-midnight-green">
                Welcome to your PHANET portal
              </p>
              <p className="text-sm text-muted-foreground">
                Take a moment to review your details and confirm they&apos;re
                up to date.
              </p>
            </div>
          </div>
          <Button
            asChild
            className="bg-midnight-green text-mikado-yellow hover:bg-midnight-green/90"
          >
            <Link href="/me/profile/edit">Review &amp; confirm</Link>
          </Button>
        </div>
      ) : null}

      {/* Identity */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-midnight-green via-midnight-green to-[#0a4d62] text-white shadow-(--shadow-float) motion-safe:rise-in">
        <div className="flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:items-center sm:p-10 sm:text-left">
          <Avatar className="size-36 shrink-0 shadow-xl ring-4 ring-mikado-yellow/70 ring-offset-4 ring-offset-midnight-green sm:size-44">
            {member.photoUrl ? (
              <AvatarImage src={member.photoUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-white/10 font-serif text-5xl text-white">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1">
              <h1 className="font-serif text-4xl font-medium tracking-tight text-balance sm:text-5xl">
                {displayName}
              </h1>
              {member.preferredName &&
              member.preferredName !== member.fullName ? (
                <p className="text-base text-white/70">{member.fullName}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/85 sm:justify-start">
              {member.occupation ? (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-mikado-yellow" />
                  {member.occupation}
                </span>
              ) : null}
              {location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-mikado-yellow" />
                  {location}
                </span>
              ) : null}
              {member.joinDate ? (
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-mikado-yellow" />
                  Member since {member.joinDate.getFullYear()}
                </span>
              ) : null}
            </div>
          </div>

          <LiquidButton
            asChild
            variant="brand"
            size="lg"
            className="rounded-xl [--liquid-button-color:var(--color-white)] hover:text-midnight-green sm:self-start"
          >
            <Link href="/me/profile/edit">
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit profile
            </Link>
          </LiquidButton>
        </div>
      </section>

      {!needsConfirmation && completeness.percent < 100 ? (
        <Link
          href="/me/profile/edit"
          className="block rounded-2xl border bg-card p-4 transition-colors hover:border-mikado-yellow/60 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">
              Your profile is {completeness.percent}% complete
            </span>
            <span className="text-muted-foreground">
              {completeness.total - completeness.filled} field
              {completeness.total - completeness.filled === 1 ? "" : "s"} to
              fill in
            </span>
          </div>
          <Progress
            value={completeness.percent}
            className="mt-3 h-2 [&>div]:bg-mikado-yellow"
          />
        </Link>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map((s, i) => (
          <section
            key={s.title}
            style={{ "--stagger": i + 1 } as React.CSSProperties}
            className="rounded-2xl border border-border/50 bg-card p-5 shadow-(--shadow-soft) motion-safe:rise-in sm:p-6"
          >
            <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-medium">
              <s.icon className="h-4 w-4 text-midnight-green" />
              {s.title}
            </h2>
            <dl className="space-y-4">
              {s.items.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    {label}
                  </dt>
                  <dd
                    className={
                      value
                        ? "mt-0.5 break-words text-base font-medium text-foreground"
                        : "mt-0.5 text-base text-muted-foreground/60"
                    }
                  >
                    {value || "Not provided"}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <AdminViewCard
        member={{
          status: member.status,
          joinDate: member.joinDate,
          salvationDate: member.salvationDate,
          baptismDate: member.baptismDate,
          weddingAnniversary: member.weddingAnniversary,
          household: member.household,
          units: member.units,
        }}
      />
    </div>
  );
}
