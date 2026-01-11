import { prisma } from "@/lib/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { FolderKanban, Users, DollarSign, CheckCircle } from "lucide-react";

async function getDashboardStats() {
  const [
    totalProjects,
    activeProjects,
    totalCommitments,
    confirmedCommitments,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.commitment.count(),
    prisma.commitment.count({ where: { status: "CONFIRMED" } }),
  ]);

  const totalRaised = await prisma.commitment.aggregate({
    where: { status: "CONFIRMED" },
    _sum: { amountCommitted: true },
  });

  return {
    totalProjects,
    activeProjects,
    totalCommitments,
    confirmedCommitments,
    totalRaised: Number(totalRaised._sum.amountCommitted || 0),
  };
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    {
      title: "Total Projects",
      value: stats.totalProjects,
      description: `${stats.activeProjects} active`,
      icon: FolderKanban,
      iconColor: "text-blue-500",
    },
    {
      title: "Total Commitments",
      value: stats.totalCommitments,
      description: `${stats.confirmedCommitments} confirmed`,
      icon: Users,
      iconColor: "text-green-500",
    },
    {
      title: "Total Raised",
      value: `GH₵ ${stats.totalRaised.toLocaleString()}`,
      description: "From confirmed commitments",
      icon: DollarSign,
      iconColor: "text-mikado-yellow",
    },
    {
      title: "Confirmation Rate",
      value:
        stats.totalCommitments > 0
          ? `${Math.round(
              (stats.confirmedCommitments / stats.totalCommitments) * 100
            )}%`
          : "N/A",
      description: "Of all commitments",
      icon: CheckCircle,
      iconColor: "text-emerald-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of fundraising activities
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
