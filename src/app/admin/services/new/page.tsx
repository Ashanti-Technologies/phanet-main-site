import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { ServiceForm } from "../_components/service-form";

function defaultDateTime(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  // datetime-local needs "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewServicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New service</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceForm
            initial={{
              title: "",
              date: defaultDateTime(),
              location: "",
              notes: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
