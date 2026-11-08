// Self-check for the DataTable URL parser: `pnpm tsx scripts/check-table-query.ts`
import assert from "node:assert/strict";
import { parseTableQuery } from "@/app/components/data-table/search-params";

// Defaults
assert.deepEqual(parseTableQuery({}, ["status"]), {
  q: "",
  page: 1,
  pageSize: 25,
  sort: null,
  filters: { status: [] },
});

// Server-side record shape (Next searchParams), incl. array values and trimming
assert.deepEqual(
  parseTableQuery(
    { q: "  ama ", page: "3", size: "50", sort: "-joinDate", status: "MEMBER,VISITOR", age: ["18-29", "x"] },
    ["status", "age"],
  ),
  {
    q: "ama",
    page: 3,
    pageSize: 50,
    sort: { id: "joinDate", desc: true },
    filters: { status: ["MEMBER", "VISITOR"], age: ["18-29"] },
  },
);

// Client URLSearchParams shape; junk page/size fall back to defaults
const q = parseTableQuery(new URLSearchParams("page=-2&size=7&sort=name&status="), ["status"]);
assert.equal(q.page, 1);
assert.equal(q.pageSize, 25);
assert.deepEqual(q.sort, { id: "name", desc: false });
assert.deepEqual(q.filters.status, []);
assert.equal(parseTableQuery({ page: "2.7" }).page, 2);
assert.equal(parseTableQuery({ page: "abc" }).page, 1);

console.log("parseTableQuery: ok");
