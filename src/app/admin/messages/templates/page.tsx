import Link from "next/link";
import { listTemplates } from "@/actions/messages";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

export default async function TemplatesPage() {
  const templates = await listTemplates();
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable bodies for bulk email and SMS. Use{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              {"{{firstName}}"}
            </code>{" "}
            and similar variables for per-recipient substitution.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/messages/templates/new">New template</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Subject / preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No templates yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link
                          href={`/admin/messages/templates/${t.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {t.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.channel}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xl truncate">
                        {t.subject || t.body.slice(0, 80)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
