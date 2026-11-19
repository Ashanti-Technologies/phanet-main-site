-- Finance ledger: funds, income, expense categories, expenses.
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOMO', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "fund" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "memberId" TEXT,
    "donorName" TEXT,
    "serviceId" TEXT,
    "commitmentId" TEXT,
    "paymentIntentId" TEXT,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "fundId" TEXT,
    "churchUnitId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "payee" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "incurredAt" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod",
    "reference" TEXT,
    "receiptUrl" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "recordedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fund_name_key" ON "fund"("name");

-- CreateIndex
CREATE UNIQUE INDEX "income_paymentIntentId_key" ON "income"("paymentIntentId");

-- CreateIndex
CREATE INDEX "income_fundId_receivedAt_idx" ON "income"("fundId", "receivedAt");

-- CreateIndex
CREATE INDEX "income_receivedAt_idx" ON "income"("receivedAt");

-- CreateIndex
CREATE INDEX "income_memberId_idx" ON "income"("memberId");

-- CreateIndex
CREATE INDEX "income_serviceId_idx" ON "income"("serviceId");

-- CreateIndex
CREATE INDEX "income_commitmentId_idx" ON "income"("commitmentId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_category_name_key" ON "expense_category"("name");

-- CreateIndex
CREATE INDEX "expense_incurredAt_idx" ON "expense"("incurredAt");

-- CreateIndex
CREATE INDEX "expense_status_idx" ON "expense"("status");

-- CreateIndex
CREATE INDEX "expense_categoryId_idx" ON "expense"("categoryId");

-- CreateIndex
CREATE INDEX "expense_churchUnitId_idx" ON "expense"("churchUnitId");

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "commitment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "payment_intent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "fund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_churchUnitId_fkey" FOREIGN KEY ("churchUnitId") REFERENCES "church_unit_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Default funds and expense categories (admins can rename / deactivate).
INSERT INTO "fund" ("id", "name", "description") VALUES
  ('fund_tithe', 'Tithe', NULL),
  ('fund_offering', 'Offering', NULL),
  ('fund_thanksgiving', 'Thanksgiving', NULL),
  ('fund_building', 'Building', NULL),
  ('fund_missions', 'Missions', NULL),
  ('fund_welfare', 'Welfare', NULL),
  ('fund_projects', 'Projects', 'Payments towards fundraising project pledges')
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "expense_category" ("id", "name") VALUES
  ('expcat_utilities', 'Utilities'),
  ('expcat_rent', 'Rent & facilities'),
  ('expcat_salaries', 'Salaries & honoraria'),
  ('expcat_transport', 'Transport'),
  ('expcat_events', 'Events & programmes'),
  ('expcat_welfare', 'Welfare & benevolence'),
  ('expcat_missions', 'Missions & outreach'),
  ('expcat_equipment', 'Equipment & maintenance'),
  ('expcat_admin', 'Administration'),
  ('expcat_other', 'Other')
ON CONFLICT ("name") DO NOTHING;
