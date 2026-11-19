"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { ConfirmDelete } from "@/app/components/confirm-delete";

type DeleteButtonProps = {
  title: string;
  description: string;
  onDelete: () => Promise<unknown>;
};

/** The standard admin "Delete" button: opens the type-"delete me" confirmation. */
export function DeleteButton({ title, description, onDelete }: DeleteButtonProps) {
  return (
    <ConfirmDelete
      trigger={
        <Button type="button" variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      }
      title={title}
      description={description}
      onConfirm={onDelete}
    />
  );
}
