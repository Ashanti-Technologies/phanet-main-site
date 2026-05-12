"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createTag, updateTag, deleteTag } from "@/actions/tags";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";

type TagRow = {
  id: string;
  label: string;
  color: string | null;
  memberCount: number;
};

export function TagsList({ initial }: { initial: TagRow[] }) {
  const [tags, setTags] = useState(initial);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newLabel.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await createTag({ label: newLabel.trim() });
      setTags([
        ...tags,
        { id: res.data.id, label: res.data.label, color: res.data.color, memberCount: 0 },
      ]);
      setNewLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(tag: TagRow, label: string) {
    if (label === tag.label) return;
    setBusyId(tag.id);
    try {
      await updateTag({ id: tag.id, label });
      setTags(tags.map((t) => (t.id === tag.id ? { ...t, label } : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await deleteTag(id);
      setTags(tags.filter((t) => t.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="New tag (e.g. New Convert)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={adding || !newLabel.trim()}>
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {tags.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tags yet.
          </p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <Input
                defaultValue={tag.label}
                onBlur={(e) => handleRename(tag, e.target.value.trim())}
                className="flex-1 max-w-xs"
              />
              <Badge variant="outline">
                {tag.memberCount} member{tag.memberCount === 1 ? "" : "s"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(tag.id)}
                disabled={busyId === tag.id}
              >
                {busyId === tag.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                )}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
