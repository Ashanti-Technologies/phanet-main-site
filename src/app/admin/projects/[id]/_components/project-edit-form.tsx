"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProject,
  deleteProject,
  updateProjectStatus,
} from "@/actions/projects";
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
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { ConfirmDelete } from "@/app/components/confirm-delete";

interface ProjectEditFormProps {
  project: {
    id: string;
    title: string;
    description: string;
    targetAmount: unknown;
    fundingMode: "SINGLE_SPONSOR" | "MULTI_CONTRIBUTOR";
    status: "ACTIVE" | "DISABLED" | "FULFILLED";
  };
}

export function ProjectEditForm({ project }: ProjectEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);

    try {
      const data = {
        id: project.id,
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        targetAmount: Number(formData.get("targetAmount")),
        fundingMode: formData.get("fundingMode") as
          | "SINGLE_SPONSOR"
          | "MULTI_CONTRIBUTOR",
        status: formData.get("status") as "ACTIVE" | "DISABLED" | "FULFILLED",
      };

      await updateProject(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Project details</CardTitle>
        <CardDescription>Update your project information</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Project title *</Label>
            <Input
              id="title"
              name="title"
              defaultValue={project.title}
              required
              minLength={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={project.description}
              required
              minLength={10}
              rows={5}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="targetAmount">Target amount (GH₵) *</Label>
              <Input
                id="targetAmount"
                name="targetAmount"
                type="number"
                defaultValue={Number(project.targetAmount)}
                min={1}
                step="0.01"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fundingMode">Funding mode *</Label>
              <Select name="fundingMode" defaultValue={project.fundingMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MULTI_CONTRIBUTOR">
                    Multi-contributor
                  </SelectItem>
                  <SelectItem value="SINGLE_SPONSOR">Single sponsor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={project.status}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
                <SelectItem value="FULFILLED">Fulfilled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <ConfirmDelete
              trigger={
                <Button type="button" variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete project
                </Button>
              }
              title="Delete this project?"
              description="All of its commitments and images will be deleted too."
              confirmLabel="Delete project"
              onConfirm={async () => {
                await deleteProject(project.id);
                router.push("/admin/projects");
              }}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
