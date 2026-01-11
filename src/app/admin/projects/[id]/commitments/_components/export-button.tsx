"use client";

import { useState } from "react";
import { getCommitmentsForExport } from "@/actions/commitments";
import { Button } from "@/app/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface ExportButtonProps {
  projectId: string;
  projectTitle: string;
}

export function ExportButton({ projectId, projectTitle }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await getCommitmentsForExport(projectId);

      if (data.length === 0) {
        alert("No commitments to export");
        return;
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Auto-size columns
      const colWidths = Object.keys(data[0]).map((key) => ({
        wch: Math.max(
          key.length,
          ...data.map((row) => String(row[key as keyof typeof row]).length)
        ),
      }));
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Commitments");

      // Generate filename
      const filename = `${projectTitle.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_commitments_${new Date().toISOString().split("T")[0]}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export commitments");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export Excel
    </Button>
  );
}
