import { prisma } from "@/lib/database";
import { summarizeLedger } from "@/lib/finance-summary";

export type ChartPoint = { label: string; value: number };

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function ageFromDob(dob: Date | null) {
  if (!dob) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDelta = now.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function ageBucket(age: number | null) {
  if (age == null) return "Unknown";
  if (age < 18) return "Under 18";
  if (age < 30) return "18-29";
  if (age < 50) return "30-49";
  if (age < 70) return "50-69";
  return "70+";
}

function increment(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

export async function getGrowthReport() {
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const members = await prisma.member.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, status: true },
  });

  const counts = new Map<string, number>();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    counts.set(monthKey(d), 0);
  }
  members.forEach((member) => increment(counts, monthKey(member.createdAt)));

  return {
    totalNew: members.length,
    activeNew: members.filter((member) =>
      ["REGULAR", "MEMBER"].includes(member.status),
    ).length,
    monthly: Array.from(counts.entries()).map(([label, value]) => ({
      label,
      value,
    })),
  };
}

export async function getDemographicsReport() {
  const members = await prisma.member.findMany({
    where: { status: { not: "DECEASED" } },
    select: {
      dob: true,
      gender: true,
      units: { include: { unit: { select: { name: true } } } },
    },
  });

  const ages = new Map<string, number>();
  const genders = new Map<string, number>();
  const units = new Map<string, number>();

  members.forEach((member) => {
    increment(ages, ageBucket(ageFromDob(member.dob)));
    increment(genders, member.gender ?? "Unknown");
    if (member.units.length === 0) increment(units, "Unassigned");
    member.units.forEach((unit) => increment(units, unit.unit.name));
  });

  return {
    totalMembers: members.length,
    ageBuckets: Array.from(ages.entries()).map(([label, value]) => ({
      label,
      value,
    })),
    genderSplit: Array.from(genders.entries()).map(([label, value]) => ({
      label,
      value,
    })),
    unitDistribution: Array.from(units.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
  };
}

export async function getEngagementReport() {
  const services = await prisma.service.findMany({
    orderBy: { date: "desc" },
    take: 24,
    include: { attendance: { select: { memberId: true, checkedInAt: true } } },
  });

  const serviceAttendance = services
    .map((service) => ({
      label: service.title,
      date: service.date,
      value: service.attendance.length,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const averageAttendance =
    serviceAttendance.length === 0
      ? 0
      : serviceAttendance.reduce((sum, service) => sum + service.value, 0) /
        serviceAttendance.length;

  const retention = await Promise.all(
    [30, 60, 90].map(async (days) => {
      const now = new Date();
      const currentStart = new Date(now);
      currentStart.setDate(now.getDate() - days);
      const previousStart = new Date(currentStart);
      previousStart.setDate(currentStart.getDate() - days);

      const [current, previous] = await Promise.all([
        prisma.attendance.findMany({
          where: { checkedInAt: { gte: currentStart } },
          select: { memberId: true },
        }),
        prisma.attendance.findMany({
          where: { checkedInAt: { gte: previousStart, lt: currentStart } },
          select: { memberId: true },
        }),
      ]);
      const currentSet = new Set(current.map((row) => row.memberId));
      const previousSet = new Set(previous.map((row) => row.memberId));
      const retained = Array.from(currentSet).filter((id) =>
        previousSet.has(id),
      ).length;
      return {
        label: `${days} days`,
        value: previousSet.size === 0 ? 0 : Math.round((retained / previousSet.size) * 100),
      };
    }),
  );

  return { averageAttendance, serviceAttendance, retention };
}

/** Finance overview for an inclusive [from, to] date range (UTC days). */
export async function getFinanceSummary(from: Date, to: Date) {
  const end = new Date(to);
  end.setUTCDate(end.getUTCDate() + 1);
  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: { receivedAt: { gte: from, lt: end }, voidedAt: null },
      select: {
        amount: true,
        receivedAt: true,
        method: true,
        voidedAt: true,
        fund: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      where: { incurredAt: { gte: from, lt: end }, voidedAt: null },
      select: {
        amount: true,
        incurredAt: true,
        status: true,
        voidedAt: true,
        category: { select: { name: true } },
      },
    }),
  ]);
  return summarizeLedger(
    incomes.map((r) => ({ ...r, fund: r.fund.name })),
    expenses.map((r) => ({ ...r, category: r.category.name })),
  );
}

export function toCsv(rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null) => {
    // Neutralise spreadsheet formulas in user-typed text (=, +, -, @),
    // but leave phone numbers like "+233 24 123 4567" alone.
    const isFormula = (v: string) =>
      /^[=@\t\r]/.test(v) || /^[+-](?![\d\s()]+$)/.test(v);
    const raw =
      value == null
        ? ""
        : typeof value === "string" && isFormula(value)
          ? `'${value}`
          : String(value);
    return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
}
