"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  functionalUpdate,
  useTable,
  type ColumnDef,
  type ColumnVisibilityState,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { features, type AppTableFeatures } from "./features";
import {
  DataTableFacetedFilter,
  type FacetOption,
} from "./data-table-faceted-filter";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";
import { DEFAULT_PAGE_SIZE, parseTableQuery } from "./search-params";

export type DataTableFilter = {
  /** URL param; in client mode also the id of the column it filters (give that column `filterFn: facetFilterFn`). */
  id: string;
  title: string;
  options: FacetOption[];
};

interface DataTableProps<TData extends { id: string }> {
  columns: ColumnDef<AppTableFeatures, TData>[];
  data: TData[];
  filters?: DataTableFilter[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  /**
   * Server mode: pass the total row count and `data` holding only the current
   * page. The server page reads the same URL params via `parseTableQuery`.
   * Omit it to page, sort, search and filter `data` in the browser.
   */
  rowCount?: number;
}

export function DataTable<TData extends { id: string }>({
  columns,
  data,
  filters = [],
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  rowCount,
}: DataTableProps<TData>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const server = rowCount !== undefined;

  const query = parseTableQuery(
    params,
    filters.map((f) => f.id),
  );
  const sorting: SortingState = query.sort ? [query.sort] : [];
  const pagination: PaginationState = {
    pageIndex: query.page - 1,
    pageSize: query.pageSize,
  };
  const [columnVisibility, setColumnVisibility] =
    React.useState<ColumnVisibilityState>({});

  function setParams(patch: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (resetPage) next.delete("page");
    const url = next.size ? `${pathname}?${next}` : pathname;
    // Server mode refetches the page; client mode only rewrites the URL
    // (Next syncs useSearchParams with history.replaceState, no round-trip).
    if (server) {
      startTransition(() => router.replace(url, { scroll: false }));
    } else {
      window.history.replaceState(null, "", url);
    }
  }

  // Debounced search box, re-synced when the URL changes (Reset, back button).
  const [search, setSearch] = React.useState(query.q);
  const [searchSource, setSearchSource] = React.useState(query.q);
  if (searchSource !== query.q) {
    setSearchSource(query.q);
    setSearch(query.q);
  }
  React.useEffect(() => {
    if (search.trim() === query.q) return;
    const t = setTimeout(() => setParams({ q: search.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const table = useTable({
    features,
    data,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      pagination,
      columnVisibility,
      globalFilter: query.q,
      columnFilters: server
        ? []
        : filters
            .filter((f) => query.filters[f.id].length)
            .map((f) => ({ id: f.id, value: query.filters[f.id] })),
    },
    globalFilterFn: "includesString",
    manualPagination: server,
    manualSorting: server,
    manualFiltering: server,
    rowCount,
    autoResetPageIndex: false,
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: (updater) => {
      const [s] = functionalUpdate(updater, sorting);
      setParams({ sort: s ? `${s.desc ? "-" : ""}${s.id}` : null });
    },
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, pagination);
      const sizeChanged = next.pageSize !== pagination.pageSize;
      const page = sizeChanged ? 0 : next.pageIndex;
      setParams(
        {
          page: page > 0 ? String(page + 1) : null,
          size:
            next.pageSize === DEFAULT_PAGE_SIZE ? null : String(next.pageSize),
        },
        false,
      );
    },
  });

  const isFiltered =
    !!query.q || filters.some((f) => query.filters[f.id].length);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-[250px]">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8"
            />
          </div>
          {filters.map((f) => (
            <DataTableFacetedFilter
              key={f.id}
              title={f.title}
              options={f.options}
              selected={query.filters[f.id]}
              onChange={(values) => setParams({ [f.id]: values.join(",") })}
              facets={
                server
                  ? undefined
                  : table.getColumn(f.id)?.getFacetedUniqueValues()
              }
            />
          ))}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() =>
                setParams(
                  Object.fromEntries(
                    ["q", ...filters.map((f) => f.id)].map((k) => [k, null]),
                  ),
                )
              }
            >
              Reset
              <X />
            </Button>
          )}
        </div>
        <DataTableViewOptions table={table} />
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-md border transition-opacity",
          isPending && "opacity-60",
        )}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {isFiltered ? "No results match your filters." : emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
