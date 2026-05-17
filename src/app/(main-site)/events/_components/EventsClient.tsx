"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, Clock, X, CalendarDays } from "lucide-react";
import {
  type Event,
  type EventCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_GRADIENTS,
  formatEventDate,
  formatEventDateShort,
} from "@/lib/events";
import posthog from "posthog-js";

const CATEGORIES: { value: "all" | EventCategory; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "national", label: "National" },
  { value: "regional", label: "Regional" },
  { value: "university-chapter", label: "University Chapter" },
  { value: "diaspora", label: "Diaspora" },
];

function EventCard({ event }: { event: Event }) {
  const { month, day } = formatEventDateShort(event.date);
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
      onClick={() =>
        posthog.capture("event_card_clicked", {
          event_id: event.id,
          event_title: event.title,
          event_category: event.category,
          event_date: event.date,
          is_featured: false,
        })
      }
    >
      {/* Image / Gradient area */}
      <div
        className={`relative h-48 sm:h-52 bg-gradient-to-br ${CATEGORY_GRADIENTS[event.category]} flex-shrink-0`}
      >
        {/* Date badge */}
        <div className="absolute top-4 left-4 bg-white rounded-xl px-3 py-2 text-center shadow-md min-w-[52px]">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {month}
          </p>
          <p className="text-2xl font-bold text-gray-900 leading-none">{day}</p>
        </div>

        {/* Category badge */}
        <div className="absolute top-4 right-4">
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${CATEGORY_COLORS[event.category]}`}
          >
            {CATEGORY_LABELS[event.category]}
          </span>
        </div>

        {/* Decorative pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
          }}
        />
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-5">
        <h3 className="font-bold text-gray-900 text-lg leading-snug mb-3 group-hover:text-crayola transition-colors line-clamp-2">
          {event.title}
        </h3>

        <div className="space-y-1.5 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span>{formatEventDate(event.date, event.endDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>

        <p className="text-gray-500 text-sm line-clamp-2 mb-5 flex-1">
          {event.description}
        </p>

        <span className="inline-flex items-center text-sm font-semibold text-crayola gap-1 group-hover:gap-2 transition-all">
          Learn More
          <span className="text-base">→</span>
        </span>
      </div>
    </Link>
  );
}

function FeaturedEventCard({ event }: { event: Event }) {
  return (
    <Link
      href={`/events/${event.slug}`}
      className="group relative rounded-2xl overflow-hidden flex flex-col lg:flex-row bg-gray-900 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/10 mb-10"
      onClick={() =>
        posthog.capture("event_card_clicked", {
          event_id: event.id,
          event_title: event.title,
          event_category: event.category,
          event_date: event.date,
          is_featured: true,
        })
      }
    >
      {/* Gradient background (left on desktop, top on mobile) */}
      <div
        className={`relative h-56 sm:h-64 lg:h-auto lg:w-[45%] bg-gradient-to-br ${CATEGORY_GRADIENTS[event.category]} flex-shrink-0`}
      >
        {/* Featured label */}
        <div className="absolute top-4 left-4">
          <span className="bg-white text-gray-900 text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow">
            Featured
          </span>
        </div>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
        {/* Large date */}
        <div className="absolute bottom-4 left-4 text-white">
          <p className="text-sm font-semibold uppercase tracking-wider opacity-80">
            {new Date(event.date).toLocaleDateString("en-US", { month: "long" })}
          </p>
          <p className="text-6xl font-black leading-none">
            {new Date(event.date).getDate()}
          </p>
          {event.endDate && (
            <p className="text-sm opacity-70">
              — {new Date(event.endDate).getDate()}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col justify-center p-6 lg:p-10 flex-1">
        <span
          className={`inline-flex w-fit text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-4 ${CATEGORY_COLORS[event.category]}`}
        >
          {CATEGORY_LABELS[event.category]}
        </span>
        <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3 group-hover:text-crayola transition-colors">
          {event.title}
        </h3>
        <p className="text-gray-400 text-base mb-6 line-clamp-2">
          {event.description}
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400 mb-6">
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
        <span className="inline-flex w-fit items-center gap-2 bg-crayola text-white text-sm font-semibold px-6 py-3 rounded-full group-hover:bg-red-600 transition-colors">
          Learn More <span>→</span>
        </span>
      </div>
    </Link>
  );
}

type Props = { events: Event[] };

export default function EventsClient({ events }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<"all" | EventCategory>(
    (searchParams.get("category") as EventCategory) ?? "all"
  );

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushUrl = useCallback(
    (q: string, cat: string) => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (cat !== "all") params.set("category", cat);
      const qs = params.toString();
      router.replace(`/events${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  const handleSearch = (value: string) => {
    setQuery(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => pushUrl(value, category), 350);
  };

  const handleCategory = (value: "all" | EventCategory) => {
    setCategory(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    posthog.capture("events_category_filtered", { category: value });
    pushUrl(query, value);
  };

  const clearSearch = () => {
    setQuery("");
    pushUrl("", category);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const { featured, rest } = useMemo(() => {
    const q = query.toLowerCase().trim();
    const filtered = events.filter((e) => {
      const matchCat = category === "all" || e.category === category;
      const matchQ =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q);
      return matchCat && matchQ;
    });

    const featuredEvent = filtered.find((e) => e.isFeatured);
    const otherEvents = filtered.filter((e) => !e.isFeatured);
    return { featured: featuredEvent, rest: otherEvents };
  }, [events, query, category]);

  const totalResults = (featured ? 1 : 0) + rest.length;

  return (
    <section className="bg-gray-50 min-h-screen">
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Search + categories row */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Search input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-crayola/30 focus:border-crayola transition-all placeholder:text-gray-400"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-none flex-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleCategory(cat.value)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    category === cat.value
                      ? "bg-crayola text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Events content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        {/* Results count */}
        <p className="text-sm text-gray-400 mb-6">
          {totalResults === 0
            ? "No events found"
            : `${totalResults} event${totalResults !== 1 ? "s" : ""} found`}
          {category !== "all" && (
            <span> in {CATEGORY_LABELS[category as EventCategory]}</span>
          )}
          {query && <span> matching &ldquo;{query}&rdquo;</span>}
        </p>

        {totalResults === 0 ? (
          <div className="text-center py-24">
            <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No events found
            </h3>
            <p className="text-gray-400 mb-6">
              Try adjusting your search or filter to find events.
            </p>
            <button
              onClick={() => {
                setQuery("");
                setCategory("all");
                pushUrl("", "all");
              }}
              className="inline-flex items-center px-5 py-2.5 rounded-full bg-crayola text-white text-sm font-medium hover:bg-red-600 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Featured event */}
            {featured && <FeaturedEventCard event={featured} />}

            {/* Events grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
