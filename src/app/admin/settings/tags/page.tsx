import { listTags } from "@/actions/tags";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { TagsList } from "./_components/tags-list";

export default async function TagsPage() {
  const tags = await listTags();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
        <p className="text-sm text-muted-foreground">
          Group members with lightweight labels (e.g. New Convert, Leader, Youth).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All tags</CardTitle>
          <CardDescription>
            Tags are case-sensitive labels you can apply to members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TagsList
            initial={tags.map((t) => ({
              id: t.id,
              label: t.label,
              color: t.color,
              memberCount: t._count.members,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
