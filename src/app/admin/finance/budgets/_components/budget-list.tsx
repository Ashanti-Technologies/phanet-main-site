"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteBudget, type BudgetWithActuals } from "@/actions/finance";
import { ConfirmDelete } from "@/app/components/confirm-delete";
import { Button } from "@/app/components/ui/button";
import { BudgetProgress } from "../../_components/budget-progress";
import { BudgetDialog, type BudgetOptions } from "./budget-dialog";

function DeleteBudget({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDelete
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Delete ${name}`} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      }
      title={`Delete the budget "${name}"?`}
      description="Expenses are not affected."
      confirmLabel="Delete budget"
      onConfirm={async () => {
        await deleteBudget(id);
        router.refresh();
      }}
    />
  );
}

export function BudgetList({
  budgets,
  options,
  canEdit,
}: {
  budgets: BudgetWithActuals[];
  options: BudgetOptions;
  canEdit: boolean;
}) {
  if (budgets.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No budgets yet.</p>;
  }
  return (
    <div className="divide-y">
      {budgets.map((b) => (
        <div key={b.id} className="py-4 first:pt-0 last:pb-0">
          <BudgetProgress
            b={b}
            actions={
              canEdit ? (
                <>
                  <BudgetDialog options={options} budget={b} />
                  <DeleteBudget id={b.id} name={b.name} />
                </>
              ) : null
            }
          />
        </div>
      ))}
    </div>
  );
}
