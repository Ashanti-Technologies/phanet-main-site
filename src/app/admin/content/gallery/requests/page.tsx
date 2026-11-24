import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTakedownRequests } from "@/actions/gallery";
import { takedownReasons } from "@/lib/schemas/gallery.schema";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { TakedownActions } from "../_components/takedown-actions";

export default async function TakedownRequestsPage() {
  const requests = await getTakedownRequests();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/content/gallery">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Removal requests</h1>
          <p className="text-sm text-muted-foreground">
            These photos are hidden until you decide. Remove deletes the photo; Restore shows it again.
          </p>
        </div>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-muted-foreground">No pending requests.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed Cloudinary URL */}
                <img src={r.thumbUrl} alt="" className="h-32 w-32 shrink-0 rounded-md object-cover" />
                <div className="min-w-0 flex-1 space-y-1 text-sm">
                  <p className="font-medium">{takedownReasons[r.reason]}</p>
                  {r.note && <p className="text-muted-foreground">“{r.note}”</p>}
                  <p className="text-muted-foreground">
                    {r.user.name} · {r.user.email}
                  </p>
                  <p className="text-muted-foreground">
                    <Link href={`/admin/content/gallery/${r.photo.album.id}`} className="underline-offset-4 hover:underline">
                      {r.photo.album.title}
                    </Link>{" "}
                    · {r.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <TakedownActions id={r.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
