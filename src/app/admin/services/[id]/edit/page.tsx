import { notFound } from "next/navigation";
import { getService } from "@/actions/attendance";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ServiceForm } from "../../_components/service-form";

function toInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) notFound();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Edit service
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm
            initial={{
              id: service.id,
              title: service.title,
              date: toInputValue(service.date),
              location: service.location ?? "",
              notes: service.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
