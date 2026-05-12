import { getAdminSermonFeatures } from "@/actions/cms";
import { SermonFeatureForm } from "./_components/sermon-feature-form";

export default async function AdminSermonsPage() {
  const sermons = await getAdminSermonFeatures();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sermons</h1>
        <p className="text-muted-foreground">
          Curate featured YouTube messages without changing the YouTube feed.
        </p>
      </div>
      <div className="space-y-4">
        {sermons.map((sermon) => (
          <SermonFeatureForm key={sermon.id} sermon={sermon} />
        ))}
        <SermonFeatureForm />
      </div>
    </div>
  );
}
