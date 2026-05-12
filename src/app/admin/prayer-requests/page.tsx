import { getAdminPrayerRequests } from "@/actions/prayer-requests";
import { PrayerRequestsList } from "./_components/prayer-requests-list";

export default async function AdminPrayerRequestsPage() {
  const prayers = await getAdminPrayerRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Prayer Requests</h1>
        <p className="text-muted-foreground">
          Review, pray over, note, and archive requests submitted by Elim.
        </p>
      </div>
      <PrayerRequestsList prayers={prayers} />
    </div>
  );
}
