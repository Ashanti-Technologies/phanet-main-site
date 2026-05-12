"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/app/components/ui/button";

export function MembersPagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const params = useSearchParams();
  const lastPage = Math.max(1, Math.ceil(total / pageSize));

  function urlFor(p: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    return `/admin/members?${next.toString()}`;
  }

  if (total <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium">{start.toLocaleString()}</span>–
        <span className="font-medium">{end.toLocaleString()}</span> of{" "}
        <span className="font-medium">{total.toLocaleString()}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          asChild={page > 1}
          variant="outline"
          size="sm"
          disabled={page <= 1}
        >
          {page > 1 ? (
            <Link href={urlFor(page - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Link>
          ) : (
            <span>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </span>
          )}
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">
          Page {page} of {lastPage}
        </span>
        <Button
          asChild={page < lastPage}
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
        >
          {page < lastPage ? (
            <Link href={urlFor(page + 1)}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          ) : (
            <span>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
