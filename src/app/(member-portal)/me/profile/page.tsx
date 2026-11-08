import Link from "next/link";
import {
  Bell,
  Briefcase,
  Cake,
  CheckCircle2,
  GraduationCap,
  HeartPulse,
  Home,
  type LucideIcon,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { APP_CONFIG } from "@/constants";
import {
  computeProfileCompleteness,
  getCurrentMemberOrRedirect,
} from "@/lib/member-portal";
import { formatDateShort } from "@/lib/format";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import {
  GENDER_LABELS,
  LIFE_STAGE_LABELS,
  MARITAL_LABELS,
  REGIONAL_CHAPTER_LABELS,
  STATUS_LABELS,
  TRACK_LABELS,
} from "./_components/profile-labels";

const EDIT_HREF = "/me/profile/edit";

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
  const isProfessional = p?.lifeStage === "WORKING_PROFESSIONAL";
  const org = isProfessional ? p?.organizationName : null;
  const track =
    isProfessional && p?.professionalTrack
      ? TRACK_LABELS[p.professionalTrack]
      : null;
  const lifeStage = p?.lifeStage ? LIFE_STAGE_LABELS[p.lifeStage] : null;
  const chapter = p?.regionalChapter
    ? REGIONAL_CHAPTER_LABELS[p.regionalChapter]
    : null;
  const location = [
    member.city,
    member.regionRef?.name ?? member.region,
    member.countryRef?.name ?? member.country,
  ]
    .filter(Boolean)
    .join(", ");

  const headline = member.occupation
    ? `${member.occupation}${org ? ` at ${org}` : ""}`
    : (lifeStage ?? "PHANET member");

  const milestones = [
    { label: "Gave my life to Christ", date: member.salvationDate },
    { label: "Baptised", date: member.baptismDate },
    { label: "Joined PHANET", date: member.joinDate },
    { label: "Wedding day", date: member.weddingAnniversary },
  ]
    .filter((m): m is { label: string; date: Date } => m.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const whatsappDigits = member.whatsapp?.replace(/[^\d]/g, "");

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
            <Link href={EDIT_HREF}>Review &amp; confirm</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* Intro card */}
          <section className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-(--shadow-soft) motion-safe:rise-in">
            <div className="relative h-32 overflow-hidden bg-gradient-to-br from-midnight-green via-[#0a4d62] to-midnight-green sm:h-44">
              <div className="absolute inset-0 bg-[url('/images/dot-texture.svg')] bg-[length:192px_192px] opacity-40" />
              <div className="absolute -right-16 -top-24 size-72 rounded-full bg-mikado-yellow/25 blur-3xl" />
              <div className="absolute -bottom-24 left-1/3 size-56 rounded-full bg-[#0678A6]/40 blur-3xl" />
            </div>

            <div className="px-5 pb-6 sm:px-8">
              <div className="-mt-16 flex items-end justify-between gap-4 sm:-mt-20">
                <Avatar className="size-32 bg-card shadow-xl ring-4 ring-card sm:size-40">
                  {member.photoUrl ? (
                    <AvatarImage src={member.photoUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="bg-midnight-green font-serif text-4xl text-mikado-yellow sm:text-5xl">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden gap-2 pb-1 sm:flex">
                  <ProfileActions />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <h1 className="font-serif text-3xl font-medium tracking-tight text-balance sm:text-4xl">
                  {displayName}
                </h1>
                {member.preferredName &&
                member.preferredName !== member.fullName ? (
                  <p className="text-sm text-muted-foreground">
                    {member.fullName}
                  </p>
                ) : null}
                <p className="text-lg leading-snug text-foreground/85">
                  {headline}
                </p>
                <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
                  {location ? (
                    <>
                      <span>{location}</span>
                      <span aria-hidden>·</span>
                    </>
                  ) : null}
                  <a
                    href="#contact"
                    className="font-medium text-midnight-green hover:underline"
                  >
                    Contact info
                  </a>
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Chip icon={ShieldCheck} highlight>
                  {STATUS_LABELS[member.status] ?? member.status}
                </Chip>
                {chapter ? <Chip icon={MapPin}>{chapter} chapter</Chip> : null}
                {member.joinDate ? (
                  <Chip icon={Sparkles}>
                    Member since {member.joinDate.getFullYear()}
                  </Chip>
                ) : null}
              </div>

              <div className="mt-5 flex gap-2 sm:hidden">
                <ProfileActions />
              </div>
            </div>
          </section>

          {!needsConfirmation && completeness.percent < 100 ? (
            <Link
              href={EDIT_HREF}
              className="block rounded-2xl border border-dashed border-mikado-yellow/60 bg-mikado-yellow/5 p-4 transition-colors hover:bg-mikado-yellow/10 sm:p-5"
            >
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">
                  Your profile is {completeness.percent}% complete
                </span>
                <span className="text-muted-foreground">
                  {completeness.total - completeness.filled} more to go →
                </span>
              </div>
              <Progress
                value={completeness.percent}
                className="mt-3 h-1.5 [&>div]:bg-mikado-yellow"
              />
            </Link>
          ) : null}

          <Section title="About" editable stagger={1}>
            {member.bio ? (
              <p className="whitespace-pre-line text-base leading-relaxed text-foreground/85">
                {member.bio}
              </p>
            ) : (
              <Empty href={EDIT_HREF}>
                Write a few lines so others can get to know you
              </Empty>
            )}
          </Section>

          <Section title="Work & study" editable stagger={2}>
            {member.occupation || lifeStage ? (
              <ul className="divide-y divide-border/60">
                {member.occupation ? (
                  <Row
                    icon={Briefcase}
                    title={member.occupation}
                    subtitle={[org, track].filter(Boolean).join(" · ")}
                  />
                ) : null}
                {lifeStage ? (
                  <Row
                    icon={GraduationCap}
                    title={lifeStage}
                    subtitle="Life stage"
                  />
                ) : null}
              </ul>
            ) : (
              <Empty href={EDIT_HREF}>Add what you do</Empty>
            )}
          </Section>

          <Section title="Fellowship" note="Managed by PHANET" stagger={3}>
            {chapter || member.units.length || member.household ? (
              <ul className="divide-y divide-border/60">
                {chapter ? (
                  <Row
                    icon={MapPin}
                    title={`${chapter} chapter`}
                    subtitle="Regional chapter"
                  />
                ) : null}
                {member.units.map((u) => (
                  <Row
                    key={u.unit.id}
                    icon={Users}
                    title={u.unit.name}
                    subtitle="Church unit"
                  />
                ))}
                {member.household ? (
                  <Row
                    icon={Home}
                    title={member.household.name}
                    subtitle="Household"
                  />
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t been placed in a unit yet — your group lead
                will add you soon.
              </p>
            )}
          </Section>

          <Section title="Faith journey" note="Managed by PHANET" stagger={4}>
            {milestones.length ? (
              <ol className="relative ml-2 space-y-6 border-l-2 border-mikado-yellow/40 pl-6">
                {milestones.map((m) => (
                  <li key={m.label} className="relative">
                    <span className="absolute -left-[33px] top-1 size-4 rounded-full border-4 border-card bg-mikado-yellow" />
                    <p className="font-serif text-2xl font-medium leading-none text-midnight-green tabular-nums">
                      {m.date.getFullYear()}
                    </p>
                    <p className="mt-1.5 font-medium">{m.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateShort(m.date)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your milestones — salvation, baptism, joining PHANET — will
                appear here as they&apos;re recorded.
              </p>
            )}
          </Section>
        </div>

        <aside className="space-y-6">
          <Section id="contact" title="Contact info" editable compact>
            <ul className="space-y-4">
              {member.email ? (
                <Line icon={Mail} label="Email" href={`mailto:${member.email}`}>
                  {member.email}
                </Line>
              ) : null}
              {member.phone ? (
                <Line icon={Phone} label="Phone" href={`tel:${member.phone}`}>
                  {member.phone}
                </Line>
              ) : null}
              {member.whatsapp ? (
                <Line
                  icon={MessageCircle}
                  label="WhatsApp"
                  href={whatsappDigits ? `https://wa.me/${whatsappDigits}` : undefined}
                >
                  {member.whatsapp}
                </Line>
              ) : null}
              {member.addressLine || location ? (
                <Line icon={Home} label="Address">
                  {[member.addressLine, location].filter(Boolean).join(", ")}
                </Line>
              ) : null}
            </ul>
          </Section>

          <Section title="Personal" editable compact>
            <ul className="space-y-4">
              <Line icon={Cake} label="Birthday">
                {member.dob
                  ? member.dob.toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "long",
                    })
                  : null}
              </Line>
              <Line icon={UserRound} label="Gender">
                {member.gender ? GENDER_LABELS[member.gender] : null}
              </Line>
              <Line icon={HeartPulse} label="Marital status">
                {member.maritalStatus
                  ? MARITAL_LABELS[member.maritalStatus]
                  : null}
              </Line>
            </ul>
          </Section>

          <Section title="Emergency contact" editable compact>
            {p?.emergencyContactName || p?.emergencyContactPhone ? (
              <div>
                <p className="font-medium">
                  {p.emergencyContactName ?? "Unnamed contact"}
                </p>
                {p.emergencyContactPhone ? (
                  <a
                    href={`tel:${p.emergencyContactPhone}`}
                    className="text-sm text-midnight-green hover:underline"
                  >
                    {p.emergencyContactPhone}
                  </a>
                ) : null}
              </div>
            ) : (
              <Empty href={EDIT_HREF}>Add someone we can call</Empty>
            )}
          </Section>

          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Fellowship and faith milestones are managed by PHANET admins. Spot
            something wrong? Email{" "}
            <a
              href={`mailto:${APP_CONFIG.contactEmail}`}
              className="font-medium text-midnight-green hover:underline"
            >
              {APP_CONFIG.contactEmail}
            </a>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}

function ProfileActions() {
  return (
    <>
      <Button
        asChild
        className="rounded-full bg-midnight-green text-white hover:bg-midnight-green/90"
      >
        <Link href={EDIT_HREF}>
          <Pencil className="mr-1.5 h-4 w-4" />
          Edit profile
        </Link>
      </Button>
      <Button asChild variant="outline" className="rounded-full">
        <Link href="/me/notifications">
          <Bell className="mr-1.5 h-4 w-4" />
          Notifications
        </Link>
      </Button>
    </>
  );
}

function Chip({
  icon: Icon,
  highlight,
  children,
}: {
  icon: LucideIcon;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={
        highlight
          ? "inline-flex items-center gap-1.5 rounded-full bg-mikado-yellow/20 px-3 py-1 text-xs font-medium text-midnight-green"
          : "inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/80"
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function Section({
  id,
  title,
  note,
  editable,
  compact,
  stagger = 0,
  children,
}: {
  id?: string;
  title: string;
  note?: string;
  editable?: boolean;
  compact?: boolean;
  stagger?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      style={{ "--stagger": stagger } as React.CSSProperties}
      className={`scroll-mt-24 rounded-2xl border border-border/50 bg-card shadow-(--shadow-soft) motion-safe:rise-in ${compact ? "p-5" : "p-5 sm:p-7"}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2
          className={`font-serif font-medium tracking-tight ${compact ? "text-lg" : "text-xl"}`}
        >
          {title}
        </h2>
        {editable ? (
          <Link
            href={EDIT_HREF}
            aria-label={`Edit ${title.toLowerCase()}`}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        ) : note ? (
          <span className="text-xs text-muted-foreground">{note}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Row({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
}) {
  return (
    <li className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-midnight-green/[0.07] text-midnight-green">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-base font-semibold leading-tight">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </li>
  );
}

function Line({
  icon: Icon,
  label,
  href,
  children,
}: {
  icon: LucideIcon;
  label: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-midnight-green" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {!children ? (
          <Link
            href={EDIT_HREF}
            className="text-sm text-muted-foreground/70 hover:text-midnight-green"
          >
            Add
          </Link>
        ) : href ? (
          <a
            href={href}
            {...(href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="break-words text-sm font-medium text-midnight-green hover:underline"
          >
            {children}
          </a>
        ) : (
          <p className="break-words text-sm font-medium">{children}</p>
        )}
      </div>
    </li>
  );
}

function Empty({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-midnight-green hover:underline"
    >
      + {children}
    </Link>
  );
}
