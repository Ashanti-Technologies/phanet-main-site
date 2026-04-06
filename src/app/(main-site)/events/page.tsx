import { getAllEvents } from "@/lib/events";
import EventsClient from "./_components/EventsClient";

export const metadata = {
  title: "Events | Phanerosis Prayer Network",
  description:
    "Find upcoming national, regional, university, and diaspora events from the Phanerosis Prayer Network.",
};

export default function EventsPage() {
  const events = getAllEvents();
  return (
    <main>
      {/* Hero */}
      <section className="relative bg-gray-950 pt-32 pb-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-900/60 to-gray-950" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-widest">
            What&apos;s Happening
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-4">
            Events
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            Join us at upcoming gatherings across the nation, the continent, and
            the world.
          </p>
        </div>
      </section>

      {/* Events grid + filters */}
      <EventsClient events={events} />
    </main>
  );
}
