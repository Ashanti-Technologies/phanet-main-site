import { redirect } from "next/navigation";

// The pledge-only Giving report was replaced by the Finance overview.
export default function GivingReportPage() {
  redirect("/admin/finance");
}
