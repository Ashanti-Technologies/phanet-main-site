import Link from "next/link";
import { getThankYouWallData } from "@/actions/commitments";
import { Building, Heart, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Thank you wall",
  description: "The partners supporting PHANET's kingdom projects.",
};

export default async function ThankYouWallPage() {
  const supporters = await getThankYouWallData();

  return (
    <main>
      <section className="relative overflow-hidden bg-gray-950 pt-32 pb-20">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/60 to-gray-950" />
        <div className="container relative z-10 mx-auto px-4 text-center sm:px-6 lg:px-8">
          <span className="text-sm font-semibold uppercase tracking-widest text-gray-400">Thank you</span>
          <h1 className="mt-3 mb-4 text-4xl font-bold text-white sm:text-5xl lg:text-6xl">Our partners</h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-300 sm:text-xl">
            We are deeply grateful to these generous supporters partnering with us to advance the
            kingdom of God.
          </p>
        </div>
      </section>

      <section className="min-h-[40vh] bg-gray-50">
        <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          {supporters.length === 0 ? (
            <div className="py-16 text-center">
              <Heart className="mx-auto h-14 w-14 text-gray-300" />
              <p className="mt-4 text-gray-500">
                Be the first to{" "}
                <Link href="/projects" className="font-medium text-crayola hover:underline">
                  support a project
                </Link>{" "}
                and appear on this wall.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {supporters.map((supporter) => (
                <div
                  key={supporter.id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-crayola/15 text-xl font-bold text-crayola">
                      {supporter.fullName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-gray-900">{supporter.fullName}</h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{supporter.country}</span>
                      </div>
                      {supporter.churchUnit && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                          <Building className="h-3 w-3" />
                          <span className="truncate">{supporter.churchUnit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-sm font-semibold text-gray-900">
                      GH₵ {Number(supporter.amountCommitted).toLocaleString()}
                    </p>
                    <p className="truncate text-xs text-gray-500">{supporter.project.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-12 text-center text-sm text-gray-500">
            May God bless you abundantly for your generosity and heart for the kingdom.
          </p>
        </div>
      </section>
    </main>
  );
}
