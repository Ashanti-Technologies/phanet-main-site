// Pure ledger math — no Prisma import, so scripts/finance-check.ts can run it
// without a database. Sums are done in integer pesewas to avoid float drift.

type Amount = { toString(): string } | number | string;

export type IncomeRow = {
  amount: Amount;
  receivedAt: Date;
  method: string;
  fund: string;
  voidedAt: Date | null;
};

export type ExpenseRow = {
  amount: Amount;
  incurredAt: Date;
  status: string;
  category: string;
  voidedAt: Date | null;
};

export type Bucket = { label: string; value: number };

function pesewas(a: Amount): number {
  return Math.round(Number(a.toString()) * 100);
}

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function bucketize(map: Map<string, number>): Bucket[] {
  return Array.from(map, ([label, value]) => ({ label, value: value / 100 })).sort(
    (a, b) => b.value - a.value,
  );
}

function add(map: Map<string, number>, key: string, p: number) {
  map.set(key, (map.get(key) ?? 0) + p);
}

/**
 * Income counts once received; expenses count only once PAID. Voided rows are
 * ignored everywhere. Pending/approved-but-unpaid expenses are reported apart.
 */
export function summarizeLedger(incomes: IncomeRow[], expenses: ExpenseRow[]) {
  let income = 0;
  let spent = 0;
  let awaiting = 0;
  const byFund = new Map<string, number>();
  const byMethod = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const monthly = new Map<string, { income: number; expense: number }>();
  const month = (key: string) => {
    const m = monthly.get(key) ?? { income: 0, expense: 0 };
    monthly.set(key, m);
    return m;
  };

  for (const row of incomes) {
    if (row.voidedAt) continue;
    const p = pesewas(row.amount);
    income += p;
    add(byFund, row.fund, p);
    add(byMethod, row.method, p);
    month(monthKey(row.receivedAt)).income += p;
  }

  for (const row of expenses) {
    if (row.voidedAt || row.status === "REJECTED") continue;
    const p = pesewas(row.amount);
    if (row.status !== "PAID") {
      awaiting += p;
      continue;
    }
    spent += p;
    add(byCategory, row.category, p);
    month(monthKey(row.incurredAt)).expense += p;
  }

  return {
    incomeTotal: income / 100,
    expenseTotal: spent / 100,
    net: (income - spent) / 100,
    awaitingPayment: awaiting / 100,
    byFund: bucketize(byFund),
    byMethod: bucketize(byMethod),
    byCategory: bucketize(byCategory),
    monthly: Array.from(monthly, ([label, m]) => ({
      label,
      income: m.income / 100,
      expense: m.expense / 100,
    })).sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export type LedgerSummary = ReturnType<typeof summarizeLedger>;

export type BudgetRow = {
  id: string;
  amount: Amount;
  categoryId: string | null;
  churchUnitId: string | null;
  periodStart: Date;
  /** Inclusive: the whole of this UTC day counts. */
  periodEnd: Date;
};

export type BudgetExpenseRow = {
  amount: Amount;
  incurredAt: Date;
  status: string;
  categoryId: string;
  churchUnitId: string | null;
  voidedAt: Date | null;
};

/**
 * Spend against each budget: PAID, non-voided expenses inside the period that
 * match the budget's category and unit (a null on the budget matches any).
 */
export function budgetActuals(budgets: BudgetRow[], expenses: BudgetExpenseRow[]) {
  const paid = expenses.filter((e) => !e.voidedAt && e.status === "PAID");
  return budgets.map((b) => {
    const end = new Date(b.periodEnd);
    end.setUTCDate(end.getUTCDate() + 1);
    let spent = 0;
    for (const e of paid) {
      if (e.incurredAt < b.periodStart || e.incurredAt >= end) continue;
      if (b.categoryId && e.categoryId !== b.categoryId) continue;
      if (b.churchUnitId && e.churchUnitId !== b.churchUnitId) continue;
      spent += pesewas(e.amount);
    }
    const budget = pesewas(b.amount);
    return {
      id: b.id,
      budget: budget / 100,
      spent: spent / 100,
      remaining: (budget - spent) / 100,
      pct: budget ? Math.round((spent / budget) * 100) : 0,
    };
  });
}
