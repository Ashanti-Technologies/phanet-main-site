import Link from "next/link";
import { Flag, Lock, Plus } from "lucide-react";
import { getAdminAlbums } from "@/actions/gallery";
import { can } from "@/lib/auth-guard";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { StatusBadge } from "@/app/admin/_components/status-badge";

export default async function AdminGalleryPage() {
  const [{ albums, pending }, canCreate] = await Promise.all([getAdminAlbums(), can("create", "GalleryAlbum")]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Gallery</h1>
          <p className="text-sm text-muted-foreground">Photo albums shown at /gallery.</p>
        </div>
        <div className="flex gap-2">
          <Button variant={pending ? "default" : "outline"} asChild>
            <Link href="/admin/content/gallery/requests">
              <Flag className="mr-2 h-4 w-4" />
              Removal requests ({pending})
            </Link>
          </Button>
          {canCreate && (
            <Button asChild>
              <Link href="/admin/content/gallery/new">
                <Plus className="mr-2 h-4 w-4" />
                New album
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent>
          {albums.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No albums yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead className="text-right">Photos</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {albums.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/admin/content/gallery/${a.id}`} className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline">
                        {a.title}
                        {a.visibility === "MEMBERS" && <Lock className="size-3.5 text-muted-foreground" aria-label="Members only" />}
                      </Link>
                    </TableCell>
                    <TableCell>{a.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                    <TableCell>{a.event?.title ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{a._count.photos}</TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
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
