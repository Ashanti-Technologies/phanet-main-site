import { getAdminHomepageSections } from "@/actions/cms";
import { HomepageSectionForm } from "./_components/homepage-section-form";

export default async function AdminHomepagePage() {
  const sections = await getAdminHomepageSections();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Homepage</h1>
        <p className="text-sm text-muted-foreground">
          Manage reusable homepage content blocks. A published section with key{" "}
          <code>new-here-chairman</code> shows as the Chairman&apos;s note on the
          New Here page.
        </p>
      </div>
      <div className="space-y-4">
        {sections.map((section) => (
          <HomepageSectionForm key={section.id} section={section} />
        ))}
        <HomepageSectionForm />
      </div>
    </div>
  );
}
