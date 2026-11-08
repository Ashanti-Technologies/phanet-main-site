import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, Mail, Phone, MapPin } from "lucide-react";
import { getMemberById } from "@/actions/members";
import {
  getMemberPastoralCare,
  listTaskAssignableUsers,
} from "@/actions/pastoral";
import { prisma } from "@/lib/database";
import { normalizedPhoneVariants } from "@/lib/member-portal";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { MemberActions } from "./_components/member-actions";
import { PastoralCareTabs } from "./_components/pastoral-care-tabs";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function fmtDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function fmtEnum(v: string | null | undefined) {
  if (!v) return "—";
  return v
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) notFound();

  // Giving: best-effort match by email (no migration link yet — see plan Phase 5).
  const [commitments, pastoral, users, invite, prayerMatches] = await Promise.all([
    member.email
      ? prisma.commitment.findMany({
        where: { email: member.email },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          projectId: true,
          project: { select: { title: true } },
          amountCommitted: true,
          confirmedAmount: true,
          status: true,
          createdAt: true,
        },
      })
      : [],
    getMemberPastoralCare(member.id),
    listTaskAssignableUsers().catch(() => []),
    prisma.memberInvite.findUnique({
      where: { memberId: member.id },
      select: { email: true, expiresAt: true, consumedAt: true },
    }),
    getPrayerMatchesForMember(member),
  ]);

  const pastoralProps = {
    memberId: member.id,
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
    visitations: pastoral.visitations.map((visit) => ({
      id: visit.id,
      visitedAt: visit.visitedAt.toISOString(),
      notes: visit.notes,
      visitedById: visit.visitedById,
      visitedBy: visit.visitedBy,
    })),
    tasks: pastoral.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      notes: task.notes,
      dueAt: task.dueAt?.toISOString() ?? null,
      status: task.status,
      assignedToId: task.assignedToId,
      assignedTo: task.assignedTo,
    })),
    notes: pastoral.notes.map((note) => ({
      id: note.id,
      body: note.body,
      visibility: note.visibility,
      createdAt: note.createdAt.toISOString(),
      author: note.author,
    })),
    prayers: prayerMatches,
    permissions: pastoral.permissions,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          {member.photoUrl ? (
            <AvatarImage src={member.photoUrl} alt={member.fullName} />
          ) : null}
          <AvatarFallback className="text-sm bg-muted text-muted-foreground">
            {initials(member.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {member.preferredName || member.fullName}
          </h1>
          {member.preferredName && (
            <p className="text-sm text-muted-foreground">{member.fullName}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline">{member.status}</Badge>
            {member.units.map((u) => (
              <Badge key={u.unitId} variant="outline">
                {u.unit.name}
              </Badge>
            ))}
            {member.tags.map((t) => (
              <Badge key={t.tagId} variant="secondary">
                {t.tag.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button asChild size="sm">
            <Link href={`/admin/members/${member.id}/edit`}>
              <Edit className="h-4 w-4 mr-1.5" /> Edit
            </Link>
          </Button>
          <MemberActions
            memberId={member.id}
            status={member.status}
            email={member.email}
            userId={member.userId}
            invite={
              invite
                ? {
                    email: invite.email,
                    expiresAt: invite.expiresAt.toISOString(),
                    consumedAt: invite.consumedAt?.toISOString() ?? null,
                  }
                : null
            }
          />
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="household">Household</TabsTrigger>
          <TabsTrigger value="visitations">Visitations</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="prayers">Prayer</TabsTrigger>
          <TabsTrigger value="giving">Giving</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          {member.bio ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed">
                  {member.bio}
                </p>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Row icon={<Mail className="h-4 w-4" />} label="Email">
                {member.email || "—"}
              </Row>
              <Row icon={<Phone className="h-4 w-4" />} label="Phone">
                {member.phone || "—"}
              </Row>
              <Row icon={<Phone className="h-4 w-4" />} label="WhatsApp">
                {member.whatsapp || "—"}
              </Row>
              <Row icon={<MapPin className="h-4 w-4" />} label="Address">
                {[
                  member.addressLine,
                  member.city,
                  member.regionRef?.name ?? member.region,
                  member.countryRef?.name ?? member.country,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </Row>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Background</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Row label="Date of birth">{fmtDate(member.dob)}</Row>
              <Row label="Gender">{member.gender ?? "—"}</Row>
              <Row label="Marital status">{member.maritalStatus ?? "—"}</Row>
              <Row label="Occupation">{member.occupation || "—"}</Row>
              <Row label="Salvation">{fmtDate(member.salvationDate)}</Row>
              <Row label="Baptism">{fmtDate(member.baptismDate)}</Row>
              <Row label="Wedding anniversary">
                {fmtDate(member.weddingAnniversary)}
              </Row>
              <Row label="Joined">{fmtDate(member.joinDate)}</Row>
            </CardContent>
          </Card>

          {member.phanetProfile ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">PHANET profile</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Row label="Submitted">
                  {fmtDate(member.phanetProfile.formSubmittedAt)}
                </Row>
                <Row label="Life stage">
                  {fmtEnum(member.phanetProfile.lifeStage)}
                </Row>
                <Row label="Professional track">
                  {fmtEnum(member.phanetProfile.professionalTrack)}
                </Row>
                <Row label="PHANET chapter">
                  {fmtEnum(member.phanetProfile.regionalChapter)}
                </Row>
                <Row label="Organization">
                  {member.phanetProfile.organizationName || "—"}
                </Row>
                <Row label="Emergency contact">
                  {[
                    member.phanetProfile.emergencyContactName,
                    member.phanetProfile.emergencyContactPhone,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Row>
                <Row label="Tertiary institution">
                  {member.phanetProfile.tertiaryInstitution || "—"}
                </Row>
                <Row label="Tertiary programme">
                  {member.phanetProfile.tertiaryProgramme || "—"}
                </Row>
                <Row label="Tertiary year">
                  {member.phanetProfile.tertiaryYear || "—"}
                </Row>
                <Row label="Tertiary residence">
                  {member.phanetProfile.tertiaryResidence || "—"}
                </Row>
                <Row label="Tertiary role">
                  {fmtEnum(member.phanetProfile.tertiaryChapterRole)}
                </Row>
                <Row label="Tertiary executive role">
                  {member.phanetProfile.tertiaryExecutiveRole || "—"}
                </Row>
                <Row label="SHS">
                  {member.phanetProfile.shsName || "—"}
                </Row>
                <Row label="SHS programme">
                  {member.phanetProfile.shsProgramme || "—"}
                </Row>
                <Row label="SHS year">
                  {member.phanetProfile.shsYear || "—"}
                </Row>
                <Row label="SHS role">
                  {fmtEnum(member.phanetProfile.shsChapterRole)}
                </Row>
                <Row label="SHS executive role">
                  {member.phanetProfile.shsExecutiveRole || "—"}
                </Row>
                <Row label="Department">
                  {member.phanetProfile.departmentText || "—"}
                </Row>
                <Row label="National role">
                  {member.phanetProfile.nationalRole || "—"}
                </Row>
                <Row label="Overseas programme">
                  {member.phanetProfile.overseasProgramme || "—"}
                </Row>
                <Row label="Campus ministry">
                  {member.phanetProfile.campusMinistryInvolvement || "—"}
                </Row>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="household">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Household</CardTitle>
            </CardHeader>
            <CardContent>
              {member.household ? (
                <Link
                  href={`/admin/members/households/${member.household.id}`}
                  className="text-sm font-medium hover:underline"
                >
                  {member.household.name}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not assigned to a household.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visitations">
          <PastoralCareTabs section="visitations" {...pastoralProps} />
        </TabsContent>

        <TabsContent value="tasks">
          <PastoralCareTabs section="tasks" {...pastoralProps} />
        </TabsContent>

        <TabsContent value="notes">
          <PastoralCareTabs section="notes" {...pastoralProps} />
        </TabsContent>

        <TabsContent value="prayers">
          <PastoralCareTabs section="prayers" {...pastoralProps} />
        </TabsContent>

        <TabsContent value="giving">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Giving history</CardTitle>
            </CardHeader>
            <CardContent>
              {commitments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {member.email
                    ? "No commitments on file matching this member's email."
                    : "Add an email to surface giving history."}
                </p>
              ) : (
                <div className="space-y-2">
                  {commitments.map((c) => (
                    <Link
                      key={c.id}
                      href={`/admin/projects/${c.projectId}/commitments`}
                      className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/40"
                    >
                      <div>
                        <p className="text-sm font-medium">{c.project.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString()} ·{" "}
                          {c.status}
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        GH₵{" "}
                        {Number(
                          c.confirmedAmount ?? c.amountCommitted,
                        ).toLocaleString()}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function getPrayerMatchesForMember(member: NonNullable<Awaited<ReturnType<typeof getMemberById>>>) {
  const emails = member.email ? [member.email.toLowerCase()] : [];
  const phones = normalizedPhoneVariants(member.phone);
  const contactFilters = [
    ...emails.map((email) => ({ email })),
    ...phones.map((phone) => ({ phone })),
  ];

  const nameFilters = [member.fullName, member.preferredName]
    .filter(Boolean)
    .map((name) => ({
      email: null,
      phone: null,
      name: { equals: name as string, mode: "insensitive" as const },
    }));

  const [contactMatches, nameMatches] = await Promise.all([
    contactFilters.length
      ? prisma.prayerRequest.findMany({
          where: { OR: contactFilters },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [],
    nameFilters.length
      ? prisma.prayerRequest.findMany({
          where: { OR: nameFilters },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [],
  ]);

  const seen = new Set<string>();
  return [...contactMatches, ...nameMatches]
    .filter((prayer) => {
      if (seen.has(prayer.id)) return false;
      seen.add(prayer.id);
      return true;
    })
    .map((prayer) => ({
      id: prayer.id,
      content: prayer.content,
      name: prayer.name,
      email: prayer.email,
      phone: prayer.phone,
      status: prayer.status,
      createdAt: prayer.createdAt.toISOString(),
      matchType: contactMatches.some((match) => match.id === prayer.id)
        ? ("contact" as const)
        : ("name" as const),
    }));
}

function Row({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {icon && (
        <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      )}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{children}</p>
      </div>
    </div>
  );
}
