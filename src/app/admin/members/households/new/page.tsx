import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { HouseholdForm } from "../_components/household-form";

export default function NewHouseholdPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          New household
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <HouseholdForm
            initial={{
              name: "",
              addressLine: "",
              city: "",
              region: "",
              notes: "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
