"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import {
  createFollowUpTask,
  createMemberNote,
  createVisitation,
  deleteFollowUpTask,
  deleteMemberNote,
  deleteVisitation,
  updateFollowUpTask,
  updateMemberNote,
  updateVisitation,
} from "@/actions/pastoral";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";

type UserOption = { id: string; name: string; email: string };
type Visitation = {
  id: string;
  visitedAt: string;
  notes: string | null;
  visitedById: string;
  visitedBy: UserOption;
};
type FollowUpTask = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  status: "OPEN" | "DONE" | "CANCELLED";
  assignedToId: string;
  assignedTo: UserOption;
};
type MemberNote = {
  id: string;
  body: string;
  visibility: "PASTORAL" | "GENERAL";
  createdAt: string;
  author: UserOption;
};
type PrayerMatch = {
  id: string;
  content: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  matchType: "contact" | "name";
};

type Props = {
  section: "visitations" | "tasks" | "notes" | "prayers";
  memberId: string;
  users: UserOption[];
  visitations: Visitation[];
  tasks: FollowUpTask[];
  notes: MemberNote[];
  prayers: PrayerMatch[];
  permissions: {
    canCreateVisitation: boolean;
    canCreateTask: boolean;
    canCreateGeneralNote: boolean;
    canCreatePastoralNote: boolean;
    canReadPastoralNotes: boolean;
  };
};

function asDateTimeLocal(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

function asDateInput(value: string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function userLabel(user: UserOption) {
  return user.name || user.email;
}

export function PastoralCareTabs({
  section,
  memberId,
  users,
  visitations,
  tasks,
  notes,
  prayers,
  permissions,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const firstUser = users[0]?.id ?? "";

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {section === "visitations" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visitations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissions.canCreateVisitation && (
            <form
              action={(formData) =>
                run(() =>
                  createVisitation({
                    memberId,
                    visitedById: String(formData.get("visitedById") || firstUser),
                    visitedAt: String(formData.get("visitedAt") || new Date()),
                    notes: String(formData.get("notes") || ""),
                  }),
                )
              }
              className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <Field label="Visited at">
                <Input
                  name="visitedAt"
                  type="datetime-local"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                />
              </Field>
              <Field label="Visited by">
                <UserSelect name="visitedById" users={users} defaultValue={firstUser} />
              </Field>
              <div className="flex items-end">
                <Button type="submit" disabled={isPending || !firstUser}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add visit
                </Button>
              </div>
              <div className="md:col-span-3">
                <Label className="mb-2">Notes</Label>
                <Textarea name="notes" rows={2} />
              </div>
            </form>
          )}

          {visitations.length === 0 ? (
            <Empty message="No visitations recorded." />
          ) : (
            visitations.map((visit) => (
              <form
                key={visit.id}
                action={(formData) =>
                  run(() =>
                    updateVisitation({
                      id: visit.id,
                      memberId,
                      visitedById: String(formData.get("visitedById")),
                      visitedAt: String(formData.get("visitedAt")),
                      notes: String(formData.get("notes") || ""),
                    }),
                  )
                }
                className="space-y-3 rounded-md border p-3"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Visited at">
                    <Input
                      name="visitedAt"
                      type="datetime-local"
                      defaultValue={asDateTimeLocal(visit.visitedAt)}
                    />
                  </Field>
                  <Field label="Visited by">
                    <UserSelect
                      name="visitedById"
                      users={users}
                      defaultValue={visit.visitedById}
                    />
                  </Field>
                </div>
                <Field label="Notes">
                  <Textarea name="notes" rows={2} defaultValue={visit.notes ?? ""} />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button type="submit" size="sm" variant="outline" disabled={isPending}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => run(() => deleteVisitation(visit.id))}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                  </Button>
                </div>
              </form>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {section === "tasks" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Follow-up tasks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissions.canCreateTask && (
            <form
              action={(formData) =>
                run(() =>
                  createFollowUpTask({
                    memberId,
                    title: String(formData.get("title") || ""),
                    assignedToId: String(formData.get("assignedToId") || firstUser),
                    dueAt: String(formData.get("dueAt") || ""),
                    notes: String(formData.get("notes") || ""),
                    status: "OPEN",
                  }),
                )
              }
              className="space-y-3 rounded-md border bg-muted/20 p-3"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_180px_220px_auto]">
                <Field label="Task">
                  <Input name="title" placeholder="Call, visit, or follow up" />
                </Field>
                <Field label="Due">
                  <Input name="dueAt" type="date" />
                </Field>
                <Field label="Assigned to">
                  <UserSelect name="assignedToId" users={users} defaultValue={firstUser} />
                </Field>
                <div className="flex items-end">
                  <Button type="submit" disabled={isPending || !firstUser}>
                    Add task
                  </Button>
                </div>
              </div>
              <Field label="Notes">
                <Textarea name="notes" rows={2} />
              </Field>
            </form>
          )}

          {tasks.length === 0 ? (
            <Empty message="No follow-up tasks recorded." />
          ) : (
            tasks.map((task) => (
              <form
                key={task.id}
                action={(formData) =>
                  run(() =>
                    updateFollowUpTask({
                      id: task.id,
                      memberId,
                      title: String(formData.get("title") || ""),
                      assignedToId: String(formData.get("assignedToId")),
                      dueAt: String(formData.get("dueAt") || ""),
                      notes: String(formData.get("notes") || ""),
                      status: String(formData.get("status")) as FollowUpTask["status"],
                    }),
                  )
                }
                className="space-y-3 rounded-md border p-3"
              >
                <div className="grid gap-3 md:grid-cols-[1fr_160px_160px_220px]">
                  <Field label="Task">
                    <Input name="title" defaultValue={task.title} />
                  </Field>
                  <Field label="Due">
                    <Input name="dueAt" type="date" defaultValue={asDateInput(task.dueAt)} />
                  </Field>
                  <Field label="Status">
                    <Select name="status" defaultValue={task.status}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Assigned to">
                    <UserSelect
                      name="assignedToId"
                      users={users}
                      defaultValue={task.assignedToId}
                    />
                  </Field>
                </div>
                <Field label="Notes">
                  <Textarea name="notes" rows={2} defaultValue={task.notes ?? ""} />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button type="submit" size="sm" variant="outline" disabled={isPending}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => run(() => deleteFollowUpTask(task.id))}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                  </Button>
                </div>
              </form>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {section === "notes" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(permissions.canCreateGeneralNote || permissions.canCreatePastoralNote) && (
            <form
              action={(formData) =>
                run(() =>
                  createMemberNote({
                    memberId,
                    body: String(formData.get("body") || ""),
                    visibility: String(formData.get("visibility") || "GENERAL") as
                      | "GENERAL"
                      | "PASTORAL",
                  }),
                )
              }
              className="space-y-3 rounded-md border bg-muted/20 p-3"
            >
              <Field label="Visibility">
                <Select
                  name="visibility"
                  defaultValue={
                    permissions.canCreatePastoralNote ? "PASTORAL" : "GENERAL"
                  }
                >
                  <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {permissions.canCreatePastoralNote && (
                      <SelectItem value="PASTORAL">Pastoral</SelectItem>
                    )}
                    {permissions.canCreateGeneralNote && (
                      <SelectItem value="GENERAL">General</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Note">
                <Textarea name="body" rows={3} />
              </Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>Add note</Button>
              </div>
            </form>
          )}

          {notes.length === 0 ? (
            <Empty message="No notes recorded." />
          ) : (
            notes.map((note) => (
              <form
                key={note.id}
                action={(formData) =>
                  run(() =>
                    updateMemberNote({
                      id: note.id,
                      memberId,
                      body: String(formData.get("body") || ""),
                      visibility: String(formData.get("visibility")) as
                        | "GENERAL"
                        | "PASTORAL",
                    }),
                  )
                }
                className="space-y-3 rounded-md border p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{note.visibility}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {userLabel(note.author)} ·{" "}
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Select name="visibility" defaultValue={note.visibility}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {permissions.canCreatePastoralNote && (
                        <SelectItem value="PASTORAL">Pastoral</SelectItem>
                      )}
                      {permissions.canCreateGeneralNote && (
                        <SelectItem value="GENERAL">General</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea name="body" rows={3} defaultValue={note.body} />
                <div className="flex justify-end gap-2">
                  <Button type="submit" size="sm" variant="outline" disabled={isPending}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => run(() => deleteMemberNote(note.id))}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                  </Button>
                </div>
              </form>
            ))
          )}
        </CardContent>
      </Card>
      )}

      {section === "prayers" && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Matched prayer requests</CardTitle>
        </CardHeader>
        <CardContent>
          {prayers.length === 0 ? (
            <Empty message="No matching prayer requests found." />
          ) : (
            <div className="space-y-3">
              {prayers.map((prayer) => (
                <div key={prayer.id} className="rounded-md border p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={prayer.matchType === "contact" ? "default" : "outline"}>
                      {prayer.matchType === "contact" ? "Contact match" : "Possible name match"}
                    </Badge>
                    <Badge variant="outline">{prayer.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(prayer.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{prayer.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[prayer.name, prayer.email, prayer.phone].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function UserSelect({
  name,
  users,
  defaultValue,
}: {
  name: string;
  users: UserOption[];
  defaultValue: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger>
        <SelectValue placeholder="Select user" />
      </SelectTrigger>
      <SelectContent>
        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {userLabel(user)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
