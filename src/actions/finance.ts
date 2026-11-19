"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { syncCommitment, syncRegistrationPayment } from "@/lib/finance-ledger";
import { budgetActuals } from "@/lib/finance-summary";
import {
  budgetSaveSchema,
  type BudgetSaveInput,
  expenseCategorySaveSchema,
  expenseCreateSchema,
  expenseStatusSchema,
  fundSaveSchema,
  incomeCreateSchema,
  ledgerFiltersSchema,
  serviceCollectionSchema,
  voidSchema,
  type ExpenseCategorySaveInput,
  type ExpenseCreateInput,
  type ExpenseStatusInput,
  type ExpenseStatusKey,
  type FundSaveInput,
  type IncomeCreateInput,
  type LedgerFiltersInput,
  type ServiceCollectionInput,
  type VoidInput,
} from "@/lib/schemas/finance.schema";

// Every write goes through requireAdmin() (2FA + 12h session) and a CASL check.
async function guard(
  action: "read" | "create" | "update" | "delete" | "export",
  subject: "Fund" | "Income" | "Expense" | "ExpenseCategory" | "Budget",
) {
  if (action !== "read") await requireAdmin();
  return requirePermission(action, subject);
}

function revalidateFinance() {
  revalidatePath("/admin/finance", "layout");
}

/** Inclusive date range → Prisma filter (`to` covers the whole day). */
function dateFilter(from?: Date, to?: Date): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const filter: Prisma.DateTimeFilter = {};
  if (from) filter.gte = from;
  if (to) {
    const end = new Date(to);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.lt = end;
  }
  return filter;
}

// ------------------------------ Funds & categories ------------------------------

export async function listFunds() {
  await requirePermission("read", "Fund");
  return prisma.fund.findMany({ orderBy: { name: "asc" } });
}

export async function saveFund(input: FundSaveInput) {
  const data = fundSaveSchema.parse(input);
  const session = await guard(data.id ? "update" : "create", "Fund");
  const { id, ...fields } = data;
  try {
    const fund = id
      ? await prisma.fund.update({ where: { id }, data: fields })
      : await prisma.fund.create({ data: fields });
    await logAudit({
      action: id ? "fund.update" : "fund.create",
      subject: "Fund",
      subjectId: fund.id,
      meta: fields,
      actorId: session.user.id,
    });
    revalidateFinance();
    return { success: true, data: fund };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("A fund with that name already exists");
    }
    throw err;
  }
}

export async function listExpenseCategories() {
  await requirePermission("read", "ExpenseCategory");
  return prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
}

export async function saveExpenseCategory(input: ExpenseCategorySaveInput) {
  const data = expenseCategorySaveSchema.parse(input);
  const session = await guard(data.id ? "update" : "create", "ExpenseCategory");
  const { id, ...fields } = data;
  try {
    const category = id
      ? await prisma.expenseCategory.update({ where: { id }, data: fields })
      : await prisma.expenseCategory.create({ data: fields });
    await logAudit({
      action: id ? "expense_category.update" : "expense_category.create",
      subject: "ExpenseCategory",
      subjectId: category.id,
      meta: fields,
      actorId: session.user.id,
    });
    revalidateFinance();
    return { success: true, data: category };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error("A category with that name already exists");
    }
    throw err;
  }
}

// ------------------------------ Pickers ------------------------------

export async function searchMembersForFinance(q: string) {
  await requirePermission("read", "Member");
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];
  return prisma.member.findMany({
    where: {
      OR: [
        { fullName: { contains: trimmed, mode: "insensitive" } },
        { preferredName: { contains: trimmed, mode: "insensitive" } },
        { phone: { contains: trimmed } },
        { email: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    take: 15,
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, phone: true },
  });
}

/** Everything the income form needs to prefill a pledge payment. */
export async function getCommitmentForPayment(commitmentId: string) {
  await requirePermission("read", "Commitment");
  const commitment = await prisma.commitment.findUnique({
    where: { id: commitmentId },
    select: {
      id: true,
      fullName: true,
      amountCommitted: true,
      confirmedAmount: true,
      project: { select: { id: true, title: true } },
      user: { select: { member: { select: { id: true, fullName: true } } } },
    },
  });
  if (!commitment) return null;
  const paid = await prisma.income.aggregate({
    where: { commitmentId, voidedAt: null },
    _sum: { amount: true },
  });
  return {
    id: commitment.id,
    fullName: commitment.fullName,
    projectId: commitment.project.id,
    projectTitle: commitment.project.title,
    amountCommitted: commitment.amountCommitted.toNumber(),
    paidSoFar: paid._sum.amount?.toNumber() ?? 0,
    member: commitment.user.member,
  };
}

// ------------------------------ Income ------------------------------

const incomeInclude = {
  fund: { select: { id: true, name: true } },
  member: { select: { id: true, fullName: true } },
  service: { select: { id: true, title: true } },
  commitment: { select: { id: true, project: { select: { id: true, title: true } } } },
  recordedBy: { select: { id: true, name: true } },
} satisfies Prisma.IncomeInclude;

export async function listIncome(input: LedgerFiltersInput = {}) {
  await requirePermission("read", "Income");
  const f = ledgerFiltersSchema.parse(input);
  return prisma.income.findMany({
    where: {
      receivedAt: dateFilter(f.from, f.to),
      fundId: f.fundId ?? undefined,
      voidedAt: f.includeVoided ? undefined : null,
    },
    include: incomeInclude,
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    // ponytail: client-side table capped at 2000 rows; switch DataTable to server mode if a range exceeds it.
    take: 2000,
  });
}

export async function recordIncome(input: IncomeCreateInput) {
  const session = await guard("create", "Income");
  const data = incomeCreateSchema.parse(input);
  const income = await prisma.$transaction(async (tx) => {
    const row = await tx.income.create({
      data: {
        ...data,
        amount: new Prisma.Decimal(data.amount),
        recordedById: session.user.id,
      },
    });
    if (row.commitmentId) await syncCommitment(tx, row.commitmentId);
    if (row.eventRegistrationId) await syncRegistrationPayment(tx, row.eventRegistrationId);
    return row;
  });
  await logAudit({
    action: "income.create",
    subject: "Income",
    subjectId: income.id,
    meta: { amount: data.amount, fundId: data.fundId, method: data.method },
    actorId: session.user.id,
  });
  revalidateFinance();
  if (income.commitmentId) revalidatePath("/admin/projects", "layout");
  return { success: true, data: { id: income.id } };
}

export async function recordServiceCollection(input: ServiceCollectionInput) {
  const session = await guard("create", "Income");
  const data = serviceCollectionSchema.parse(input);
  const service = data.serviceId
    ? await prisma.service.findUnique({ where: { id: data.serviceId }, select: { title: true } })
    : null;
  const rows = await prisma.$transaction(
    data.rows.map((row) =>
      prisma.income.create({
        data: {
          fundId: row.fundId,
          method: row.method,
          amount: new Prisma.Decimal(row.amount),
          reference: row.reference,
          receivedAt: data.receivedAt,
          serviceId: data.serviceId,
          donorName: service ? `Collection — ${service.title}` : "Collection",
          note: data.note,
          recordedById: session.user.id,
        },
        select: { id: true },
      }),
    ),
  );
  await logAudit({
    action: "income.collection",
    subject: "Income",
    meta: { serviceId: data.serviceId, ids: rows.map((r) => r.id) },
    actorId: session.user.id,
  });
  revalidateFinance();
  return { success: true, count: rows.length };
}

export async function voidIncome(input: VoidInput) {
  const session = await guard("update", "Income");
  const { id, reason } = voidSchema.parse(input);
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.income.updateMany({
      where: { id, voidedAt: null },
      data: { voidedAt: new Date(), voidReason: reason },
    });
    if (count === 0) throw new Error("Entry not found or already voided");
    const row = await tx.income.findUniqueOrThrow({
      where: { id },
      select: { commitmentId: true, eventRegistrationId: true },
    });
    if (row.commitmentId) await syncCommitment(tx, row.commitmentId);
    // Voiding an event fee un-pays the booking.
    if (row.eventRegistrationId) await syncRegistrationPayment(tx, row.eventRegistrationId);
  });
  await logAudit({
    action: "income.void",
    subject: "Income",
    subjectId: id,
    meta: { reason },
    actorId: session.user.id,
  });
  revalidateFinance();
  revalidatePath("/admin/projects", "layout");
  return { success: true };
}

// ------------------------------ Expenses ------------------------------

const expenseInclude = {
  category: { select: { id: true, name: true } },
  fund: { select: { id: true, name: true } },
  churchUnit: { select: { id: true, name: true } },
  recordedBy: { select: { id: true, name: true } },
  approvedBy: { select: { id: true, name: true } },
} satisfies Prisma.ExpenseInclude;

export async function listExpenses(input: LedgerFiltersInput = {}) {
  await requirePermission("read", "Expense");
  const f = ledgerFiltersSchema.parse(input);
  return prisma.expense.findMany({
    where: {
      incurredAt: dateFilter(f.from, f.to),
      fundId: f.fundId ?? undefined,
      voidedAt: f.includeVoided ? undefined : null,
    },
    include: expenseInclude,
    orderBy: [{ incurredAt: "desc" }, { createdAt: "desc" }],
    take: 2000, // ponytail: same cap as listIncome
  });
}

export async function getExpense(id: string) {
  await requirePermission("read", "Expense");
  return prisma.expense.findUnique({ where: { id }, include: expenseInclude });
}

/** Status side-effects: who approved and when, when it was paid. */
function statusFields(status: ExpenseStatusKey, userId: string, now = new Date()) {
  switch (status) {
    case "APPROVED":
      return { status, approvedById: userId, approvedAt: now };
    case "PAID":
      return { status, paidAt: now };
    default:
      return { status };
  }
}

export async function recordExpense(input: ExpenseCreateInput) {
  const session = await guard("create", "Expense");
  const { status, ...data } = expenseCreateSchema.parse(input);
  const now = new Date();
  const expense = await prisma.expense.create({
    data: {
      ...data,
      amount: new Prisma.Decimal(data.amount),
      recordedById: session.user.id,
      status,
      // Recording an already-paid expense implies the recorder approved it.
      ...(status !== "PENDING" ? { approvedById: session.user.id, approvedAt: now } : {}),
      ...(status === "PAID" ? { paidAt: now } : {}),
    },
  });
  await logAudit({
    action: "expense.create",
    subject: "Expense",
    subjectId: expense.id,
    meta: { amount: data.amount, categoryId: data.categoryId, status },
    actorId: session.user.id,
  });
  revalidateFinance();
  return { success: true, data: { id: expense.id } };
}

const ALLOWED_TRANSITIONS: Record<ExpenseStatusKey, ExpenseStatusKey[]> = {
  PENDING: ["APPROVED", "PAID", "REJECTED"],
  APPROVED: ["PAID", "REJECTED"],
  PAID: [],
  REJECTED: [],
};

export async function setExpenseStatus(input: ExpenseStatusInput) {
  const session = await guard("update", "Expense");
  const { id, status } = expenseStatusSchema.parse(input);
  const current = await prisma.expense.findUnique({
    where: { id },
    select: { status: true, voidedAt: true, approvedById: true },
  });
  if (!current || current.voidedAt) throw new Error("Expense not found");
  if (!ALLOWED_TRANSITIONS[current.status].includes(status)) {
    throw new Error(`Can't move an expense from ${current.status} to ${status}`);
  }
  const fields = statusFields(status, session.user.id);
  // Paying straight from PENDING also records the approval.
  if (status === "PAID" && !current.approvedById) {
    Object.assign(fields, { approvedById: session.user.id, approvedAt: new Date() });
  }
  // Optimistic lock on the status we read, so two clicks can't both apply.
  const { count } = await prisma.expense.updateMany({
    where: { id, status: current.status, voidedAt: null },
    data: fields,
  });
  if (count === 0) throw new Error("Expense changed in the meantime — reload and try again");
  await logAudit({
    action: "expense.status",
    subject: "Expense",
    subjectId: id,
    meta: { from: current.status, to: status },
    actorId: session.user.id,
  });
  revalidateFinance();
  return { success: true };
}

export async function voidExpense(input: VoidInput) {
  const session = await guard("update", "Expense");
  const { id, reason } = voidSchema.parse(input);
  const { count } = await prisma.expense.updateMany({
    where: { id, voidedAt: null },
    data: { voidedAt: new Date(), voidReason: reason },
  });
  if (count === 0) throw new Error("Expense not found or already voided");
  await logAudit({
    action: "expense.void",
    subject: "Expense",
    subjectId: id,
    meta: { reason },
    actorId: session.user.id,
  });
  revalidateFinance();
  return { success: true };
}

// ------------------------------ Budgets ------------------------------

/** Budgets overlapping [from, to] (all budgets when omitted), with actual spend. */
export async function listBudgets(range?: { from: Date; to: Date }) {
  await requirePermission("read", "Budget");
  const budgets = await prisma.budget.findMany({
    where: range ? { periodStart: { lte: range.to }, periodEnd: { gte: range.from } } : undefined,
    include: {
      category: { select: { name: true } },
      churchUnit: { select: { name: true } },
    },
    orderBy: [{ periodStart: "desc" }, { name: "asc" }],
  });
  if (budgets.length === 0) return [];

  const start = new Date(Math.min(...budgets.map((b) => b.periodStart.getTime())));
  const end = new Date(Math.max(...budgets.map((b) => b.periodEnd.getTime())));
  end.setUTCDate(end.getUTCDate() + 1);
  const expenses = await prisma.expense.findMany({
    where: { incurredAt: { gte: start, lt: end }, status: "PAID", voidedAt: null },
    select: { amount: true, incurredAt: true, status: true, categoryId: true, churchUnitId: true, voidedAt: true },
  });
  const actuals = budgetActuals(budgets, expenses);
  return budgets.map((b, i) => ({
    ...actuals[i], // id, budget, spent, remaining, pct
    name: b.name,
    categoryId: b.categoryId,
    churchUnitId: b.churchUnitId,
    category: b.category?.name ?? null,
    churchUnit: b.churchUnit?.name ?? null,
    periodStart: b.periodStart.toISOString().slice(0, 10),
    periodEnd: b.periodEnd.toISOString().slice(0, 10),
  }));
}

export type BudgetWithActuals = Awaited<ReturnType<typeof listBudgets>>[number];

export async function saveBudget(input: BudgetSaveInput) {
  const data = budgetSaveSchema.parse(input);
  const session = await guard(data.id ? "update" : "create", "Budget");
  const { id, ...fields } = data;
  const values = { ...fields, amount: new Prisma.Decimal(fields.amount) };
  const budget = id
    ? await prisma.budget.update({ where: { id }, data: values })
    : await prisma.budget.create({ data: values });
  await logAudit({
    action: id ? "budget.update" : "budget.create",
    subject: "Budget",
    subjectId: budget.id,
    meta: { ...fields, periodStart: fields.periodStart.toISOString(), periodEnd: fields.periodEnd.toISOString() },
    actorId: session.user.id,
  });
  revalidateFinance();
  return { success: true, data: { id: budget.id } };
}

/** Budgets are plans, not ledger entries, so they can be deleted. */
export async function deleteBudget(id: string) {
  const session = await guard("delete", "Budget");
  const budget = await prisma.budget.delete({ where: { id } });
  await logAudit({
    action: "budget.delete",
    subject: "Budget",
    subjectId: id,
    meta: { name: budget.name, amount: budget.amount.toFixed(2) },
    actorId: session.user.id,
  });
  revalidateFinance();
  return { success: true };
}

// ------------------------------ Monthly gifts ------------------------------

export async function listRecurringGifts() {
  await requirePermission("read", "Income");
  const gifts = await prisma.recurringGift.findMany({
    where: { status: { not: "PENDING" } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      donorName: true,
      email: true,
      amount: true,
      status: true,
      cardLabel: true,
      dayOfMonth: true,
      nextChargeAt: true,
      failedAttempts: true,
      createdAt: true,
      member: { select: { id: true, fullName: true } },
      fund: { select: { name: true } },
    },
    take: 1000,
  });
  return gifts.map((g) => ({
    ...g,
    amount: g.amount.toNumber(),
    nextChargeAt: g.nextChargeAt?.toISOString() ?? null,
    createdAt: g.createdAt.toISOString(),
  }));
}

export type RecurringGiftRow = Awaited<ReturnType<typeof listRecurringGifts>>[number];

export async function cancelRecurringGift(id: string) {
  const session = await guard("update", "Income");
  const { count } = await prisma.recurringGift.updateMany({
    where: { id, status: { in: ["ACTIVE", "PAUSED"] } },
    data: { status: "CANCELLED", cancelledAt: new Date(), nextChargeAt: null, authorizationCode: null },
  });
  if (count === 0) throw new Error("Monthly gift not found or already cancelled");
  await logAudit({ action: "recurring_gift.cancel", subject: "Income", subjectId: id, actorId: session.user.id });
  revalidateFinance();
  return { success: true };
}
