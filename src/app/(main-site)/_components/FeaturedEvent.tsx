import { getFeaturedEvent } from "@/lib/events-data";
import { FeaturedEventCard } from "../events/_components/EventsClient";
import RevealOnScroll from "./RevealOnScroll";

export default async function FeaturedEvent() {
  const event = await getFeaturedEvent();
  if (!event) return null;

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <RevealOnScroll className="text-center mb-10">
          <span className="text-crayola text-sm font-semibold uppercase tracking-widest">
            Don&apos;t miss it
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mt-2">
            Featured event
          </h2>
        </RevealOnScroll>
        <RevealOnScroll delay={0.1}>
          <FeaturedEventCard event={event} />
        </RevealOnScroll>
      </div>
    </section>
  );
}
