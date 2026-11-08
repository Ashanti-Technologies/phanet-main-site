// Shared by the client DataTable and server pages: table state lives in the URL.
// ?q=search&page=2&size=50&sort=-date&status=DRAFT,PUBLISHED

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export type TableSearchParams = Record<string, string | string[] | undefined>;

export type TableQuery = {
  q: string;
  page: number;
  pageSize: number;
  sort: { id: string; desc: boolean } | null;
  filters: Record<string, string[]>;
};

export function parseTableQuery(
  sp: URLSearchParams | TableSearchParams,
  filterIds: readonly string[] = [],
): TableQuery {
  const get = (k: string) => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? "";
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const page = Math.floor(Number(get("page")));
  const size = Number(get("size"));
  const sort = get("sort");
  return {
    q: get("q").trim(),
    page: page > 0 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(size)
      ? size
      : DEFAULT_PAGE_SIZE,
    sort: sort
      ? { id: sort.replace(/^-/, ""), desc: sort.startsWith("-") }
      : null,
    filters: Object.fromEntries(
      filterIds.map((id) => [id, get(id).split(",").filter(Boolean)]),
    ),
  };
}
