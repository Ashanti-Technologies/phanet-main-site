import {
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  type ColumnDef,
  type FilterFn,
  type RowData,
} from "@tanstack/react-table";

// TanStack Table v9: register only the features our admin tables use.
export const features = tableFeatures({
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSortingFeature,
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: { includesString: filterFn_includesString },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
});

export type AppTableFeatures = typeof features;
export type AppColumnDef<TData extends RowData> = ColumnDef<
  AppTableFeatures,
  TData
>;

export function columnHelper<TData extends RowData>() {
  return createColumnHelper<AppTableFeatures, TData>();
}

/** Faceted (multi-select) filter: row matches if its value — or any item of an array value — is selected. */
export const facetFilterFn = ((row, id, selected: string[]) => {
  const value = row.getValue(id);
  return Array.isArray(value)
    ? value.some((v) => selected.includes(String(v)))
    : selected.includes(String(value));
}) as FilterFn<AppTableFeatures, any>;
