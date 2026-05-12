import { getThankYouWallData } from "@/actions/commitments";
import { Card, CardContent } from "@/app/components/ui/card";
import { Heart, MapPin, Building } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ThankYouWallPage() {
  const supporters = await getThankYouWallData();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <Heart className="h-12 w-12 mx-auto text-red-500 animate-pulse" />
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Thank You Wall
        </h1>
        <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
          We are deeply grateful to these generous supporters who are partnering
          with us to advance the kingdom of God.
        </p>
      </div>

      {/* Supporters Grid */}
      {supporters.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">
            Be the first to support our projects and appear on this wall!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {supporters.map((supporter) => (
            <Card
              key={supporter.id}
              className="group overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mikado-yellow to-yellow-500 text-xl font-bold text-white">
                    {supporter.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">
                      {supporter.fullName}
                    </h3>
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{supporter.country}</span>
                    </div>
                    {supporter.churchUnit && (
                      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Building className="h-3 w-3" />
                        <span className="truncate">{supporter.churchUnit}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t">
                  <p className="text-sm font-medium text-cerulean">
                    GH₵ {Number(supporter.amountCommitted).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {supporter.project.title}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer Message */}
      <div className="mt-16 text-center">
        <div className="inline-block rounded-lg bg-muted px-6 py-4">
          <p className="text-sm text-muted-foreground">
            🙏 May God bless you abundantly for your generosity and heart for
            the kingdom!
          </p>
        </div>
      </div>
    </div>
  );
}
