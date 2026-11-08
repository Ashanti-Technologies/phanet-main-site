import { listBatches } from "@/actions/messages";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { BatchesTable } from "../_components/message-tables";

export default async function BatchesPage() {
  const batches = await listBatches();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sent batches</h1>
        <p className="text-sm text-muted-foreground">
          History of bulk email and SMS sends.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 100 batches</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchesTable batches={batches} />
        </CardContent>
      </Card>
    </div>
  );
}
