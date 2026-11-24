"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveTakedown } from "@/actions/gallery";
import { Button } from "@/app/components/ui/button";
import { ConfirmDelete } from "@/app/components/confirm-delete";

export function TakedownActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex gap-2 pt-2">
      <ConfirmDelete
        trigger={
          <Button type="button" size="sm" variant="destructive" disabled={pending}>
            Remove photo
          </Button>
        }
        title="Remove photo"
        description="This deletes the photo for good."
        confirmLabel="Remove"
        onConfirm={async () => {
          await resolveTakedown(id, "REMOVED");
          router.refresh();
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resolveTakedown(id, "DISMISSED");
            router.refresh();
          })
        }
      >
        Restore
      </Button>
    </div>
  );
}
