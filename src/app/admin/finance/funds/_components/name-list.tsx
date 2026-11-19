"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { saveExpenseCategory, saveFund } from "@/actions/finance";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/animate-ui/components/radix/switch";

type Item = { id: string; name: string; isActive: boolean };

/** Rename / activate / add for funds and expense categories (same shape). */
export function NameList({ kind, items }: { kind: "fund" | "category"; items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const save = kind === "fund" ? saveFund : saveExpenseCategory;

  function run(input: { id?: string; name: string; isActive: boolean }, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await save(input);
        after?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const draft = drafts[item.id] ?? item.name;
        const dirty = draft.trim() !== item.name && draft.trim().length > 0;
        return (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
              className={item.isActive ? "" : "text-muted-foreground"}
              aria-label={`${kind} name`}
            />
            {dirty && (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run({ ...item, name: draft }, () => setDrafts(({ [item.id]: _, ...rest }) => rest))}
              >
                Save
              </Button>
            )}
            <Switch
              checked={item.isActive}
              disabled={pending}
              onCheckedChange={(isActive) => run({ ...item, isActive })}
              aria-label={item.isActive ? "Active" : "Inactive"}
            />
          </div>
        );
      })}
      <form
        className="flex items-center gap-2 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (newName.trim()) run({ name: newName, isActive: true }, () => setNewName(""));
        }}
      >
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={kind === "fund" ? "New fund name" : "New category name"}
        />
        <Button type="submit" size="sm" disabled={pending || !newName.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="ml-1">Add</span>
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
