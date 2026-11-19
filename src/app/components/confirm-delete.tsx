"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/animate-ui/components/radix/alert-dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export const CONFIRM_PHRASE = "delete me";

/**
 * Every admin delete goes through this: a modal that only enables the
 * delete button once the admin types "delete me". `onConfirm` may throw or
 * return a `{ success: false, error }` result; either keeps the modal open
 * with the error shown.
 */
export function ConfirmDelete({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
}: {
  /** The button that opens the modal (rendered as-is). */
  trigger: React.ReactElement;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const matches = typed.trim().toLowerCase() === CONFIRM_PHRASE;

  function confirm() {
    if (!matches) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await onConfirm();
        if (res && typeof res === "object" && "success" in res && res.success === false) {
          setError("error" in res && typeof res.error === "string" ? res.error : "Couldn't delete it.");
          return;
        }
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't delete it.");
      }
    });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        setOpen(next);
        if (!next) {
          setTyped("");
          setError(null);
        }
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            // The dialog is portalled, but React still bubbles submit to a form
            // the trigger sits in (e.g. a room's Save form). Don't let it.
            e.stopPropagation();
            confirm();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {description}
                <p className="font-medium text-destructive">This can&apos;t be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>
              Cancel
            </AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={!matches || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
