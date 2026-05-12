import Link from "next/link";
import { notFound } from "next/navigation";
import { getHouseholdById } from "@/actions/households";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { HouseholdForm } from "../_components/household-form";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default async function HouseholdDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const household = await getHouseholdById(id);
  if (!household) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {household.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {household.members.length} member
          {household.members.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <HouseholdForm
              initial={{
                id: household.id,
                name: household.name,
                addressLine: household.addressLine ?? "",
                city: household.city ?? "",
                region: household.region ?? "",
                notes: household.notes ?? "",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members</CardTitle>
          </CardHeader>
          <CardContent>
            {household.members.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No members assigned. From the directory, edit a member and pick
                this household.
              </p>
            ) : (
              <div className="space-y-2">
                {household.members.map((m) => (
                  <Link
                    key={m.id}
                    href={`/admin/members/${m.id}`}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/40"
                  >
                    <Avatar className="h-8 w-8">
                      {m.photoUrl ? (
                        <AvatarImage src={m.photoUrl} alt={m.fullName} />
                      ) : null}
                      <AvatarFallback className="text-[11px] bg-muted text-muted-foreground">
                        {initials(m.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium flex-1 truncate">
                      {m.fullName}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <div className="pt-3 border-t mt-3">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link
                  href={`/admin/members?householdId=${household.id}`}
                >
                  Manage members in directory
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
