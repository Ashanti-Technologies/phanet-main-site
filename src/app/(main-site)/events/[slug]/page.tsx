import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  Clock,
  MapPin,
  ArrowLeft,
  ExternalLink,
  Ticket,
  ImagePlus,
} from "lucide-react";
import { HOE } from "@/lib/event-subdomain";
import { priceRangeLabel } from "@/lib/event-fees";
import {
  type Event,
  formatEventDate,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_GRADIENTS,
} from "@/lib/events";
import { getEventBySlug } from "@/lib/events-data";
import { APP_CONFIG } from "@/constants";

export const dynamic = "force-dynamic";

/**
 * Social preview image. Flyers are portrait and carry their own text, so pad
 * (never crop) them into the 1200×630 card via a Cloudinary transform.
 */
function ogImageFor(event: Event) {
  const alt = event.imageAlt || `${event.title} flyer`;
  if (event.imageUrl?.includes("res.cloudinary.com") && event.imageUrl.includes("/upload/")) {
    return {
      url: event.imageUrl.replace(
        "/upload/",
        "/upload/c_pad,w_1200,h_630,b_auto:predominant,f_jpg,q_auto/",
      ),
      width: 1200,
      height: 630,
      alt,
    };
  }
  if (event.imageUrl) return { url: event.imageUrl, alt };
  if (event.headerImageUrl) return { url: event.headerImageUrl, alt: event.title };
  // A child openGraph replaces the root one, so the default image must be restated.
  return { url: "/api/og", width: 1200, height: 630, alt: event.title };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  const url = `/events/${event.slug}`;
  const description = `${formatEventDate(event.date, event.endDate)} · ${event.location}. ${event.description}`;
  const image = ogImageFor(event);
  return {
    title: event.title, // root layout template appends the site name
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: "Phanerosis Prayer Network International",
      title: event.title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [image.url],
    },
  };
}

/** schema.org offers: one per price tier; free events get a single price-0 offer. */
function eventOffers(event: Event, url: string) {
  const tiers =
    event.paymentMode && event.paymentMode !== "FREE" && event.priceTiers?.length
      ? event.priceTiers
      : [{ name: "Free", amount: 0 }];
  const closes = event.registrationClosesAt ?? `${event.date}T00:00:00Z`;
  const availability =
    new Date(closes) > new Date() ? "https://schema.org/InStock" : "https://schema.org/SoldOut";
  return tiers.map((t) => ({
    "@type": "Offer",
    name: t.name,
    price: t.amount.toFixed(2),
    priceCurrency: "GHS",
    url,
    availability,
    validThrough: closes,
  }));
}

function eventJsonLd(event: Event) {
  const isOnline = event.location.trim().toLowerCase() === "online";
  const url = `${APP_CONFIG.siteUrl}/events/${event.slug}`;
  const image = ogImageFor(event).url;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    url,
    startDate: event.date,
    endDate: event.endDate ?? event.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: isOnline
      ? { "@type": "VirtualLocation", url }
      : {
          "@type": "Place",
          name: event.location,
          address: event.address ?? event.location,
        },
    image: [
      image.startsWith("/") ? `${APP_CONFIG.siteUrl}${image}` : image,
      ...(event.imageUrl && event.imageUrl !== image ? [event.imageUrl] : []),
    ],
    organizer: {
      "@type": "Organization",
      name: "Phanerosis Prayer Network International",
      url: APP_CONFIG.siteUrl,
    },
    offers: eventOffers(event, url),
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
      {/* Plain script, not components/JsonLd: next/script dedupes its fixed id against the root Organization block. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd(event)).replace(/</g, "\\u003c"),
        }}
      />
      {/* Hero banner */}
      <section
        className={`relative bg-gradient-to-br ${CATEGORY_GRADIENTS[event.category]} pt-32 pb-16 overflow-hidden`}
      >
        {event.headerImageUrl ? (
          <Image
            src={event.headerImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: "20px 20px",
            }}
          />
        )}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${event.headerImageUrl ? "from-black/60 via-black/40 to-black/70" : "from-black/40 via-black/20 to-black/50"}`}
        />

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
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full bg-background text-foreground">
                Featured
              </span>
            )}
          </div>

          {/* Event title */}
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-6 max-w-3xl">
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
      <section className="bg-background py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">
            {/* Body text */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-6">
                About This Event
              </h2>
              <div
                className="rich-text text-lg text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: event.bodyHtml || event.body,
                }}
              />
            </div>

            {/* Sidebar: flyer + what the hero doesn't already say */}
            <div className="lg:col-span-1 order-1 lg:order-2 space-y-6">
              {event.imageUrl && (
                <Image
                  src={event.imageUrl}
                  alt={event.imageAlt || `${event.title} flyer`}
                  width={1200}
                  height={1500}
                  sizes="(min-width: 1024px) 33vw, 100vw"
                  className="mx-auto h-auto w-full max-w-md rounded-2xl border border-border"
                />
              )}

              <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-5 h-5 text-crayola flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-card-foreground mb-0.5">
                      Venue
                    </p>
                    <p className="text-muted-foreground">{event.location}</p>
                    {event.address && (
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {event.address}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <Ticket className="w-5 h-5 text-crayola flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-card-foreground mb-0.5">Fees</p>
                    {event.paymentMode && event.paymentMode !== "FREE" && event.priceTiers?.length ? (
                      <ul className="space-y-1.5">
                        {event.priceTiers.map((t) => (
                          <li key={t.name}>
                            <div className="flex justify-between gap-3 text-muted-foreground">
                              <span>{t.name}</span>
                              <span className="font-medium text-card-foreground tabular-nums">
                                {priceRangeLabel([t.amount])}
                              </span>
                            </div>
                            {t.description && (
                              <p className="text-xs text-muted-foreground/80">{t.description}</p>
                            )}
                          </li>
                        ))}
                        {event.paymentMode === "PAY_AT_EVENT" && (
                          <li className="pt-1 text-xs text-muted-foreground">Paid at the event.</li>
                        )}
                        {event.paymentMode === "ONLINE" && (
                          <li className="pt-1 text-xs text-muted-foreground">
                            Paid online by card or Mobile Money when you register.
                          </li>
                        )}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">Free</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {event.registrationUrl?.startsWith("/") ? (
                    <Link href={event.registrationUrl} className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-colors text-sm">
                      Register Now
                    </Link>
                  ) : event.registrationUrl ? (
                    <a
                      href={event.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
                    >
                      Register Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : null}
                  {event.slug === HOE.slug && (
                    <Link
                      href={`/events/${event.slug}/flyer`}
                      className="flex items-center justify-center gap-2 w-full border border-primary text-primary hover:bg-primary/5 font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
                    >
                      <ImagePlus className="w-4 h-4" />
                      Make your &ldquo;I&apos;m repping&rdquo; flyer
                    </Link>
                  )}
                  <Link
                    href="/events"
                    className="flex items-center justify-center w-full border border-border text-muted-foreground hover:bg-muted font-medium py-3 px-6 rounded-xl transition-colors text-sm"
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
