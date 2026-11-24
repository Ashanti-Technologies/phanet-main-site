import Link from "next/link";
import { Plus, UsersRound } from "lucide-react";
import { getAdminLibrary } from "@/actions/library";
import { can } from "@/lib/auth-guard";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { StatusBadge, humanize } from "@/app/admin/_components/status-badge";

const ACCESS_LABEL = { FREE: "Free", AMAZON: "Amazon", PAID: "Paid (preview)" } as const;

export default async function AdminLibraryPage() {
  const [{ authors, publications }, canCreate] = await Promise.all([
    getAdminLibrary(),
    can("create", "Publication"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
          <p className="text-sm text-muted-foreground">
            Books and devotionals by members of the network, shown at /library.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/content/library/authors">
              <UsersRound className="mr-2 h-4 w-4" />
              Authors ({authors.length})
            </Link>
          </Button>
          {canCreate && authors.length > 0 && (
            <Button asChild>
              <Link href="/admin/content/library/new">
                <Plus className="mr-2 h-4 w-4" />
                New book
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          {publications.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {authors.length === 0
                ? "Add an author first, then their books."
                : "No books yet."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="text-right">Pages</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publications.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/admin/content/library/${p.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {p.title}
                      </Link>
                    </TableCell>
                    <TableCell>{p.author.name}</TableCell>
                    <TableCell>{humanize(p.kind)}</TableCell>
                    <TableCell>{ACCESS_LABEL[p.access]}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.pageCount ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
