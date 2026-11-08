"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  createRoomType,
  createRooms,
  deleteRoom,
  deleteRoomType,
  updateRoom,
} from "@/actions/event-rooms";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { DeleteButton } from "@/app/admin/_components/delete-button";

export type RoomOption = {
  id: string;
  name: string;
  typeId: string;
  typeName: string;
  beds: number;
  gender: "MALE" | "FEMALE" | null;
  used: number;
};

type RoomType = {
  id: string;
  name: string;
  description: string | null;
  rooms: RoomOption[];
};

export const GENDER_LABEL = { MALE: "Men only", FEMALE: "Women only" } as const;

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Runs a server action from a form; shows its error inline. */
function useAction() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ success: boolean; error?: string }>, onOk?: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.success) onOk?.();
      else setError(res.error ?? "Something went wrong");
    });
  };
  return { isPending, error, run };
}

/**
 * onSubmit (not `action`): React resets `action` forms immediately, which
 * would wipe input on a failed save. Reset only after success, if asked.
 */
function submitWith(
  run: ReturnType<typeof useAction>["run"],
  fn: (fd: FormData) => Promise<{ success: boolean; error?: string }>,
  resetOnSuccess = true,
) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    run(() => fn(fd), resetOnSuccess ? () => form.reset() : undefined);
  };
}

export function RoomSetup({ eventId, roomTypes }: { eventId: string; roomTypes: RoomType[] }) {
  const add = useAction();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Room setup</CardTitle>
        <p className="text-sm text-muted-foreground">
          Group rooms by type (e.g. &ldquo;Dormitory&rdquo;, &ldquo;Family room&rdquo;), then add
          the rooms and how many beds each has.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {roomTypes.map((t) => (
          <RoomTypeBlock key={t.id} type={t} />
        ))}

        <form
          className="flex flex-wrap items-end gap-3 rounded-md border border-dashed p-4"
          onSubmit={submitWith(add.run, (fd) =>
            createRoomType(eventId, {
              name: fd.get("name"),
              description: fd.get("description"),
            }),
          )}
        >
          <div className="space-y-1">
            <Label htmlFor="rt-name">New room type</Label>
            <Input id="rt-name" name="name" placeholder="e.g. Dormitory" required />
          </div>
          <div className="min-w-60 flex-1 space-y-1">
            <Label htmlFor="rt-desc">Description</Label>
            <Input id="rt-desc" name="description" placeholder="Optional" />
          </div>
          <Button type="submit" disabled={add.isPending}>
            {add.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Add room type
          </Button>
          {add.error && <p role="alert" className="w-full text-sm text-destructive">{add.error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

function RoomTypeBlock({ type }: { type: RoomType }) {
  const add = useAction();
  const beds = type.rooms.reduce((n, r) => n + r.beds, 0);
  const used = type.rooms.reduce((n, r) => n + r.used, 0);

  return (
    <section className="space-y-3 rounded-md border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{type.name}</h3>
          <p className="text-sm text-muted-foreground">
            {type.description ? `${type.description} · ` : ""}
            {type.rooms.length} rooms · {used}/{beds} beds used
          </p>
        </div>
        <DeleteButton
          title={`Delete ${type.name}?`}
          description="All its rooms are removed and anyone in them goes back to unassigned."
          onDelete={async () => {
            await deleteRoomType(type.id);
          }}
        />
      </div>

      {type.rooms.length > 0 && (
        <div className="divide-y rounded-md border">
          {type.rooms.map((r) => (
            <RoomRow key={r.id} room={r} />
          ))}
        </div>
      )}

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={submitWith(add.run, (fd) =>
          createRooms(type.id, {
            name: fd.get("name"),
            beds: fd.get("beds"),
            gender: fd.get("gender"),
            quantity: fd.get("quantity"),
          }),
        )}
      >
        <div className="space-y-1">
          <Label htmlFor={`${type.id}-name`}>Room name</Label>
          <Input id={`${type.id}-name`} name="name" placeholder="e.g. Room" required className="w-40" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${type.id}-beds`}>Beds</Label>
          <Input id={`${type.id}-beds`} name="beds" type="number" min={1} defaultValue={4} className="w-20" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${type.id}-gender`}>For</Label>
          <select id={`${type.id}-gender`} name="gender" className={selectClass} defaultValue="">
            <option value="">Anyone / family</option>
            <option value="MALE">Men only</option>
            <option value="FEMALE">Women only</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${type.id}-qty`}>How many</Label>
          <Input id={`${type.id}-qty`} name="quantity" type="number" min={1} max={200} defaultValue={1} className="w-20" />
        </div>
        <Button type="submit" variant="outline" disabled={add.isPending}>
          {add.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Add
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          &ldquo;How many&rdquo; above 1 numbers them: Room 1, Room 2, …
        </p>
        {add.error && <p role="alert" className="w-full text-sm text-destructive">{add.error}</p>}
      </form>
    </section>
  );
}

function RoomRow({ room }: { room: RoomOption }) {
  const save = useAction();
  const del = useAction();
  const [confirming, setConfirming] = useState(false);
  const full = room.used >= room.beds;

  return (
    <form
      className="flex flex-wrap items-center gap-3 p-3"
      onSubmit={submitWith(
        save.run,
        (fd) =>
          updateRoom(room.id, {
            name: fd.get("name"),
            beds: fd.get("beds"),
            gender: fd.get("gender"),
          }),
        false,
      )}
    >
      <Input name="name" defaultValue={room.name} aria-label="Room name" className="w-40" />
      <Input name="beds" type="number" min={1} defaultValue={room.beds} aria-label="Beds" className="w-20" />
      <select name="gender" defaultValue={room.gender ?? ""} aria-label="Who can stay" className={selectClass}>
        <option value="">Anyone / family</option>
        <option value="MALE">Men only</option>
        <option value="FEMALE">Women only</option>
      </select>
      <span className={`text-sm tabular-nums ${full ? "font-medium text-destructive" : "text-muted-foreground"}`}>
        {room.used}/{room.beds} {full ? "full" : "used"}
      </span>
      <div className="ml-auto flex gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={save.isPending}>
          {save.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={del.isPending}
          onClick={() =>
            room.used && !confirming
              ? setConfirming(true)
              : del.run(() => deleteRoom(room.id))
          }
          onBlur={() => setConfirming(false)}
        >
          {confirming ? `Remove and unassign ${room.used}?` : "Remove"}
        </Button>
      </div>
      {(save.error || del.error) && (
        <p role="alert" className="w-full text-sm text-destructive">{save.error || del.error}</p>
      )}
    </form>
  );
}
