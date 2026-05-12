import Image from "next/image";
import Link from "next/link";
import ElimHourLiveCard from "./ElimHourLiveCard";
import QuoteTile from "./QuoteTile";
import RevealOnScroll from "./RevealOnScroll";

export default function NewHere() {
  return (
    <section className="py-20 bg-gray-50 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <RevealOnScroll className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Three ways to get started
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Whether you&apos;re new to prayer or a seasoned intercessor,
            there&apos;s a place for you here.
          </p>
        </RevealOnScroll>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Featured: Elim Hour live card */}
          <RevealOnScroll delay={0.1} className="col-span-1 md:col-span-2">
            <ElimHourLiveCard />
          </RevealOnScroll>

          {/* Quote tile (replaces decorative image) */}
          <QuoteTile delay={0.2} />

          {/* Community Card */}
          <RevealOnScroll
            delay={0.3}
            className="relative rounded-2xl overflow-hidden min-h-[320px] lg:min-h-[380px] md:col-span-2 lg:col-span-3"
          >
            <Image
              src="/images/landing/happy.webp"
              alt="Community gathering"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 75vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end p-8">
              <span className="text-white/80 text-sm font-semibold uppercase tracking-wider">
                New here?
              </span>
              <h3 className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-3">
                Find your community
              </h3>
              <p className="text-white/90 text-base max-w-md mb-6">
                You are welcome at PHANET. Connect with intercessors near you
                at our next gathering.
              </p>
              <Link
                href="/events"
                className="inline-block w-fit px-6 py-3 rounded-full font-medium text-sm bg-crayola text-white hover:bg-crayola/90 transition-colors"
              >
                Find an event
              </Link>
            </div>
          </RevealOnScroll>

          {/* Leader Card */}
          <RevealOnScroll
            delay={0.4}
            className="bg-white rounded-2xl overflow-hidden shadow-lg min-h-[320px] lg:min-h-[380px] flex flex-col md:col-span-2 lg:col-span-1"
          >
            <div className="relative h-40 lg:h-48">
              <Image
                src="/images/landing/founder.webp"
                alt="Dr. Godfred Bonnah Nkansah"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 25vw, 50vw"
              />
            </div>
            <div className="p-6 flex flex-col flex-1 justify-between">
              <div>
                <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider">
                  Meet the Chairman
                </span>
                <h3 className="text-xl font-bold text-gray-900 mt-1">
                  Dr. Godfred Bonnah Nkansah
                </h3>
                <p className="text-gray-600 text-sm mt-2">
                  Founder & Chairman, Phanerosis Prayer Network International.
                </p>
              </div>
              <Link
                href="/about#chairman"
                className="inline-block w-fit px-6 py-2.5 rounded-full font-medium text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors mt-4"
              >
                Read his message
              </Link>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
