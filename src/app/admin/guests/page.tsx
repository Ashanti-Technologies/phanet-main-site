import Link from "next/link";
import { can } from "@/lib/auth-guard";
import { getGuestChapters, getGuests, type GuestFilter } from "@/actions/guests";
import { listTaskAssignableUsers } from "@/actions/pastoral";
import { Stat } from "@/app/admin/_components/stat";
import { cn } from "@/lib/utils";
import { GuestsList } from "./_components/guests-list";

const FILTERS: { key: GuestFilter; label: string }[] = [
  { key: "new", label: "Waiting" },
  { key: "active", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "all", label: "All" },
];

export default async function AdminGuestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; unit?: string }>;
}) {
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status)?.key ?? "new";
  const unit = sp.unit || undefined;

  const [{ guests, stats }, chapters, users, canSeeMembers] = await Promise.all([
    getGuests({ filter, unit }),
    getGuestChapters(),
    (await can("read", "User")) ? listTaskAssignableUsers() : Promise.resolve([]),
    can("read", "Member"),
  ]);

  const href = (next: { status?: string; unit?: string }) => {
    const q = new URLSearchParams();
    const status = next.status ?? filter;
    const u = "unit" in next ? next.unit : unit;
    if (status !== "new") q.set("status", status);
    if (u) q.set("unit", u);
    const s = q.toString();
    return `/admin/guests${s ? `?${s}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New guests</h1>
        <p className="text-sm text-muted-foreground">
          People who planned their first Elim Hour on the New Here page. Take a
          guest to add a welcome task to your list, or move them to the right
          chapter. &ldquo;National&rdquo; guests didn&apos;t pick a chapter.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Waiting for someone" value={stats.waiting} tone={stats.waiting ? "warning" : undefined} />
        <Stat label="Guests, last 90 days" value={stats.total} />
        <Stat label="Welcomed (90 days)" value={stats.welcomed} />
        <Stat label="Now regular or member (90 days)" value={stats.stayed} tone="success" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href({ status: f.key })}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              f.key === filter ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {f.label}
          </Link>
        ))}
        <span className="mx-2 h-5 w-px bg-border" aria-hidden />
        {[{ id: "", name: "All chapters" }, { id: "national", name: "National" }, ...chapters].map((c) => (
          <Link
            key={c.id || "all"}
            href={href({ unit: c.id || undefined })}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              (unit ?? "") === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <GuestsList guests={guests} chapters={chapters} users={users} canSeeMembers={canSeeMembers} />
    </div>
  );
}
