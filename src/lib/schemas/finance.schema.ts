import { z } from "zod";

export const PAYMENT_METHODS = [
  "CASH",
  "MOMO",
  "BANK_TRANSFER",
  "CARD",
  "CHEQUE",
  "OTHER",
] as const;

export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  CASH: "Cash",
  MOMO: "Mobile Money",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export const EXPENSE_STATUSES = ["PENDING", "APPROVED", "PAID", "REJECTED"] as const;

// Money is validated as a decimal string (max 2 dp) and handed to Prisma.Decimal
// as-is, so no float rounding ever touches an amount.
const money = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim().replace(/,/g, ""))
  .pipe(
    z
      .string()
      .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 150 or 150.50")
      .refine((v) => Number(v) > 0, "Amount must be greater than zero"),
  );

const date = z.union([z.string(), z.date()]).transform((v, ctx) => {
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) {
    ctx.addIssue({ code: "custom", message: "Invalid date" });
    return z.NEVER;
  }
  return d;
});

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => v || null);

const optId = z
  .string()
  .optional()
  .nullable()
  .transform((v) => v || null);

// ------------------------------ Funds & categories ------------------------------

export const fundSaveSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  isActive: z.boolean().default(true),
});

export const expenseCategorySaveSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  isActive: z.boolean().default(true),
});

// ------------------------------ Income ------------------------------

export const incomeCreateSchema = z.object({
  fundId: z.string().min(1, "Choose a fund"),
  amount: money,
  receivedAt: date,
  method: z.enum(PAYMENT_METHODS),
  reference: optText(120),
  memberId: optId,
  donorName: optText(120),
  serviceId: optId,
  commitmentId: optId,
  eventRegistrationId: optId,
  note: optText(1000),
});

/** One counted collection (e.g. a Sunday service): many fund × method lines. */
export const serviceCollectionSchema = z.object({
  serviceId: optId,
  receivedAt: date,
  note: optText(1000),
  rows: z
    .array(
      z.object({
        fundId: z.string().min(1, "Choose a fund"),
        method: z.enum(PAYMENT_METHODS),
        amount: money,
        reference: optText(120),
      }),
    )
    .min(1, "Add at least one line")
    .max(50),
});

export const voidSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().min(3, "Give a short reason").max(300),
});

// ------------------------------ Expenses ------------------------------

export const expenseCreateSchema = z.object({
  categoryId: z.string().min(1, "Choose a category"),
  fundId: optId,
  churchUnitId: optId,
  amount: money,
  payee: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(2000),
  incurredAt: date,
  method: z.enum(PAYMENT_METHODS).optional().nullable(),
  reference: optText(120),
  // Rendered as a link/img in the admin — only accept our Cloudinary uploads.
  receiptUrl: z
    .url({ protocol: /^https$/, hostname: /^res\.cloudinary\.com$/ })
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => v || null),
  // Finance can record an expense that is already approved or paid.
  status: z.enum(["PENDING", "APPROVED", "PAID"]).default("PENDING"),
});

export const expenseStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(EXPENSE_STATUSES),
});

// ------------------------------ Budgets ------------------------------

export const budgetSaveSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, "Name the budget").max(120),
    categoryId: optId,
    churchUnitId: optId,
    periodStart: date,
    periodEnd: date,
    amount: money,
  })
  .refine((b) => b.periodEnd >= b.periodStart, { message: "The end date must be after the start date", path: ["periodEnd"] });

export type BudgetSaveInput = z.input<typeof budgetSaveSchema>;

// ------------------------------ Online giving ------------------------------

export const giveSchema = z.object({
  fundId: z.string().min(1, "Choose what you're giving towards"),
  amount: money.refine((v) => Number(v) >= 1, "The minimum gift is GH₵ 1").refine(
    (v) => Number(v) <= 1_000_000,
    "For gifts above GH₵ 1,000,000 please contact the finance team",
  ),
  fullName: z.string().trim().min(1, "Enter your name").max(120),
  email: z.email("Enter a valid email for your receipt").max(160),
});

export type GiveInput = z.input<typeof giveSchema>;

// ------------------------------ Filters ------------------------------

export const ledgerFiltersSchema = z.object({
  from: date.optional(),
  to: date.optional(),
  fundId: optId,
  includeVoided: z.boolean().default(false),
});

export type FundSaveInput = z.input<typeof fundSaveSchema>;
export type ExpenseCategorySaveInput = z.input<typeof expenseCategorySaveSchema>;
export type IncomeCreateInput = z.input<typeof incomeCreateSchema>;
export type ServiceCollectionInput = z.input<typeof serviceCollectionSchema>;
export type VoidInput = z.input<typeof voidSchema>;
export type ExpenseCreateInput = z.input<typeof expenseCreateSchema>;
export type ExpenseStatusInput = z.input<typeof expenseStatusSchema>;
export type LedgerFiltersInput = z.input<typeof ledgerFiltersSchema>;
export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number];
export type ExpenseStatusKey = (typeof EXPENSE_STATUSES)[number];
