"use client";

import { useState } from "react";
import {
  createChurchUnit,
  updateChurchUnit,
  deleteChurchUnit,
} from "@/actions/church-units";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";

interface ChurchUnit {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

interface ChurchUnitsListProps {
  initialUnits: ChurchUnit[];
}

export function ChurchUnitsList({ initialUnits }: ChurchUnitsListProps) {
  const [units, setUnits] = useState(initialUnits);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!newName.trim()) return;

    setIsAdding(true);
    try {
      const result = await createChurchUnit({ name: newName.trim() });
      if (result.success && result.churchUnit) {
        setUnits([...units, result.churchUnit]);
        setNewName("");
      }
    } catch (error) {
      console.error("Failed to add:", error);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggleActive(unit: ChurchUnit) {
    setUpdatingIds(new Set([...updatingIds, unit.id]));
    try {
      await updateChurchUnit({ id: unit.id, isActive: !unit.isActive });
      setUnits(
        units.map((u) =>
          u.id === unit.id ? { ...u, isActive: !u.isActive } : u
        )
      );
    } catch (error) {
      console.error("Failed to update:", error);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(unit.id);
        return next;
      });
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteChurchUnit(id);
      setUnits(units.filter((u) => u.id !== id));
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ministry Family Options</CardTitle>
        <CardDescription>
          Define the options available in the commitment form dropdown. Users
          can also enter free text if their unit is not listed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new unit */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter new option (e.g., Media Department)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} disabled={isAdding || !newName.trim()}>
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Units list */}
        <div className="space-y-2">
          {units.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No church units defined yet. Add one above.
            </p>
          ) : (
            units.map((unit) => (
              <div
                key={unit.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                <span className="flex-1 font-medium">{unit.name}</span>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`active-${unit.id}`}
                    className="text-xs text-muted-foreground"
                  >
                    Active
                  </Label>
                  <Switch
                    id={`active-${unit.id}`}
                    checked={unit.isActive}
                    onCheckedChange={() => handleToggleActive(unit)}
                    disabled={updatingIds.has(unit.id)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(unit.id)}
                  disabled={deletingId === unit.id}
                >
                  {deletingId === unit.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Examples: Cell/House Fellowship, Zone, Media Department, Choir,
          Protocol, Region/Campus, Partner Church, Online Fellowship
        </p>
      </CardContent>
    </Card>
  );
}
