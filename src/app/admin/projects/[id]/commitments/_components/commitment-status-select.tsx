"use client";

import { useState } from "react";
import { updateCommitmentStatus } from "@/actions/commitments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Loader2 } from "lucide-react";

interface CommitmentStatusSelectProps {
  commitmentId: string;
  currentStatus: "PENDING" | "CONFIRMED" | "CANCELLED";
}

const statusColors = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

export function CommitmentStatusSelect({
  commitmentId,
  currentStatus,
}: CommitmentStatusSelectProps) {
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleStatusChange(newStatus: string) {
    if (newStatus === status) return;

    setIsUpdating(true);
    try {
      await updateCommitmentStatus({
        id: commitmentId,
        status: newStatus as "PENDING" | "CONFIRMED" | "CANCELLED",
      });
      setStatus(newStatus as "PENDING" | "CONFIRMED" | "CANCELLED");
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="relative">
      {isUpdating && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
      <Select
        value={status}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger className={`w-32 text-xs ${statusColors[status]}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="CONFIRMED">Confirmed</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
