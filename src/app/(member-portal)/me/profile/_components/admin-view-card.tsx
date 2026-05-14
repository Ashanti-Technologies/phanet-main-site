import { ShieldCheck } from "lucide-react";
import { APP_CONFIG } from "@/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { formatDateShort } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = {
  VISITOR: "Visitor",
  PENDING_APPROVAL: "Pending approval",
  REGULAR: "Regular member",
  MEMBER: "Member",
  INACTIVE: "Inactive",
  TRANSFERRED: "Transferred",
  DECEASED: "Deceased",
};

export type AdminViewMember = {
  status: string;
  joinDate: Date | null;
  salvationDate: Date | null;
  baptismDate: Date | null;
  weddingAnniversary: Date | null;
  household: { id: string; name: string } | null;
  units: Array<{ unit: { id: string; name: string } }>;
};

export function AdminViewCard({ member }: { member: AdminViewMember }) {
  const items: Array<{ label: string; value: React.ReactNode }> = [
    {
      label: "Membership status",
      value: (
        <Badge variant="outline" className="font-normal">
          {STATUS_LABELS[member.status] ?? member.status}
        </Badge>
      ),
    },
    {
      label: "Joined PHANET",
      value: member.joinDate ? formatDateShort(member.joinDate) : "—",
    },
    {
      label: "Household",
      value: member.household?.name ?? "—",
    },
    {
      label: "Church units",
      value:
        member.units.length === 0
          ? "—"
          : member.units.map((u) => u.unit.name).join(", "),
    },
    {
      label: "Salvation date",
      value: member.salvationDate
        ? formatDateShort(member.salvationDate)
        : "—",
    },
    {
      label: "Baptism date",
      value: member.baptismDate ? formatDateShort(member.baptismDate) : "—",
    },
    {
      label: "Wedding anniversary",
      value: member.weddingAnniversary
        ? formatDateShort(member.weddingAnniversary)
        : "—",
    },
  ];

  return (
    <Card className="border-midnight-green/20 bg-muted/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-midnight-green" />
          <CardTitle className="text-base">What your group lead sees</CardTitle>
        </div>
        <CardDescription>
          These details are managed by PHANET admins. Spot something wrong?
          Email{" "}
          <a
            href={`mailto:${APP_CONFIG.contactEmail}`}
            className="font-medium text-midnight-green underline-offset-2 hover:underline"
          >
            {APP_CONFIG.contactEmail}
          </a>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-0.5 text-sm sm:gap-1"
            >
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                {item.label}
              </dt>
              <dd className="font-medium text-foreground">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
