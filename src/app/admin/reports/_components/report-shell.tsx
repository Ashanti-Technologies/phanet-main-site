import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function ReportHeader({
  title,
  description,
  exportHref,
}: {
  title: string;
  description: string;
  exportHref: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={exportHref}>
          <Download className="mr-1.5 h-4 w-4" /> Export CSV
        </Link>
      </Button>
    </div>
  );
}

