import { getMyTasks } from "@/actions/pastoral";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { MyTasksList } from "./_components/my-tasks-list";

export default async function AdminTasksPage() {
  const tasks = await getMyTasks();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My tasks</h1>
        <p className="text-sm text-muted-foreground">
          Follow-ups assigned to your account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tasks.length.toLocaleString()} assigned task
            {tasks.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MyTasksList
            tasks={tasks.map((task) => ({
              id: task.id,
              title: task.title,
              notes: task.notes,
              dueAt: task.dueAt?.toISOString() ?? null,
              status: task.status,
              member: task.member,
              createdBy: task.createdBy,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
