"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateFollowUpTaskStatus } from "@/actions/pastoral";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

type Task = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  status: "OPEN" | "DONE" | "CANCELLED";
  member: { id: string; fullName: string; preferredName: string | null };
  createdBy: { name: string; email: string };
};

export function MyTasksList({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStatus(id: string, status: Task["status"]) {
    setPendingId(id);
    startTransition(async () => {
      await updateFollowUpTaskStatus({ id, status });
      setPendingId(null);
      router.refresh();
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No tasks assigned to you.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="rounded-md border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-medium">{task.title}</h2>
                <Badge variant="outline">{task.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                <Link
                  href={`/admin/members/${task.member.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {task.member.preferredName || task.member.fullName}
                </Link>
                {task.dueAt && (
                  <> · due {new Date(task.dueAt).toLocaleDateString()}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={task.status}
                onValueChange={(value) =>
                  updateStatus(task.id, value as Task["status"])
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/members/${task.member.id}`}>Open</Link>
              </Button>
            </div>
          </div>
          {task.notes && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {task.notes}
            </p>
          )}
          {isPending && pendingId === task.id && (
            <p className="mt-2 inline-flex items-center text-xs text-muted-foreground">
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Saving
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
