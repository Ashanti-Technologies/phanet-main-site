import Link from "next/link";
import { notFound } from "next/navigation";
import { Edit, Mail, Phone, MapPin } from "lucide-react";
import { getMemberById } from "@/actions/members";
import { can } from "@/lib/auth-guard";
import { prisma } from "@/lib/database";
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

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getMemberById(id);
  if (!member) notFound();

  const canSeeNotes = await can("read", "Note", { visibility: "PASTORAL" });

  // Giving: best-effort match by email (no migration link yet — see plan Phase 5).
  const commitments = member.email
    ? await prisma.commitment.findMany({
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
    : [];

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
        <Button asChild size="sm">
          <Link href={`/admin/members/${member.id}/edit`}>
            <Edit className="h-4 w-4 mr-1.5" /> Edit
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="household">Household</TabsTrigger>
          {canSeeNotes && <TabsTrigger value="notes">Notes</TabsTrigger>}
          <TabsTrigger value="giving">Giving</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
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
                {[member.addressLine, member.city, member.region, member.country]
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

        {canSeeNotes && (
          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pastoral note</CardTitle>
              </CardHeader>
              <CardContent>
                {member.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No notes recorded.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

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
