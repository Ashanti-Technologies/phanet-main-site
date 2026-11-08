import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import {
  formatEventDate,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_GRADIENTS,
} from "@/lib/events";
import { getEventBySlug } from "@/lib/events-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  return {
    title: `${event.title} | Phanerosis Prayer Network`,
    description: event.description,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <main>
      {/* Hero banner */}
      <section
        className={`relative bg-gradient-to-br ${CATEGORY_GRADIENTS[event.category]} pt-32 pb-16 overflow-hidden`}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/50" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Back link */}
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            All Events
          </Link>

          {/* Category + featured tag */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span
              className={`text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${CATEGORY_COLORS[event.category]}`}
            >
              {CATEGORY_LABELS[event.category]}
            </span>
            {event.isFeatured && (
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-white text-gray-900">
                Featured
              </span>
            )}
          </div>

          {/* Event title */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 max-w-3xl">
            {event.title}
          </h1>

          {/* Quick details row */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-white/80 text-sm sm:text-base">
            <span className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              {formatEventDate(event.date, event.endDate)}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {event.time}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {event.location}
            </span>
          </div>
        </div>
      </section>

      {/* Content section */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">
            {/* Body text */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                About This Event
              </h2>
              <div
                className="prose prose-lg max-w-none text-gray-600"
                dangerouslySetInnerHTML={{
                  __html: event.bodyHtml || event.body,
                }}
              />
            </div>

            {/* Details sidebar */}
            <div className="lg:col-span-1 order-1 lg:order-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                <h3 className="text-lg font-bold text-gray-900 mb-5">
                  Event Details
                </h3>

                <ul className="space-y-4 text-sm text-gray-600 mb-6">
                  <li className="flex items-start gap-3">
                    <CalendarDays className="w-5 h-5 text-crayola flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-800 mb-0.5">Date</p>
                      <p>{formatEventDate(event.date, event.endDate)}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-crayola flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-800 mb-0.5">Time</p>
                      <p>{event.time}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-crayola flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-800 mb-0.5">
                        Location
                      </p>
                      <p>{event.location}</p>
                      {event.address && (
                        <p className="text-gray-400 text-xs mt-0.5">
                          {event.address}
                        </p>
                      )}
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span
                      className={`w-5 h-5 rounded-full flex-shrink-0 mt-0.5 ${CATEGORY_COLORS[event.category].split(" ")[0]}`}
                    />
                    <div>
                      <p className="font-semibold text-gray-800 mb-0.5">
                        Category
                      </p>
                      <p>{CATEGORY_LABELS[event.category]}</p>
                    </div>
                  </li>
                </ul>

                <div className="space-y-3">
                  {event.registrationUrl?.startsWith("/") ? (
                    <Link
                      href={event.registrationUrl}
                      className="flex items-center justify-center gap-2 w-full bg-crayola hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
                    >
                      Register Now
                    </Link>
                  ) : event.registrationUrl ? (
                    <a
                      href={event.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-crayola hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
                    >
                      Register Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : null}
                  <Link
                    href="/events"
                    className="flex items-center justify-center w-full border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium py-3 px-6 rounded-xl transition-colors text-sm"
                  >
                    Browse All Events
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
