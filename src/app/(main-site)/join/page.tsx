import Link from "next/link";
import { getNextElimHour } from "@/lib/events";
import { formatEventDate } from "@/lib/events";

export const metadata = {
  title: "Join PHANET | Phanerosis Prayer Network",
  description:
    "Become part of the Phanerosis Prayer Network International — join Elim Hour, find a chapter, and step into the ministry of intercession.",
};

export default function JoinPage() {
  const { date } = getNextElimHour();
  const nextSundayLabel = formatEventDate(date.toISOString().slice(0, 10));

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
            Get connected
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-4">
            Become an intercessor.
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            You don&apos;t need to be a seasoned prayer warrior to belong here.
            You just need to show up.
          </p>
        </div>
      </section>

      {/* Three ways to join */}
      <section id="how-to-join" className="scroll-mt-24 py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-midnight-green text-white">
              How to join
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-gray-900">
              Three ways to get started.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sunday service */}
            <div className="bg-antiflash-white rounded-2xl p-8 flex flex-col">
              <span className="text-sm font-semibold uppercase tracking-wider text-crayola">
                01 · This Sunday
              </span>
              <h3 className="mt-3 text-2xl font-bold text-gray-900">
                Join Elim Hour
              </h3>
              <p className="mt-3 text-gray-700 flex-1">
                Our weekly online gathering. Next service: {nextSundayLabel} at
                7:00 PM GMT.
              </p>
              <Link
                href="/messages"
                className="mt-6 inline-flex items-center w-fit px-5 py-2.5 rounded-full font-medium bg-crayola text-white hover:bg-crayola/90 transition-colors"
              >
                Watch live
              </Link>
            </div>

            {/* Find a chapter */}
            <div className="bg-antiflash-white rounded-2xl p-8 flex flex-col">
              <span className="text-sm font-semibold uppercase tracking-wider text-cerulean">
                02 · In person
              </span>
              <h3 className="mt-3 text-2xl font-bold text-gray-900">
                Find a chapter
              </h3>
              <p className="mt-3 text-gray-700 flex-1">
                We have chapters across Ghana, the wider African continent, the
                UK, and North America.
              </p>
              <Link
                href="/events"
                className="mt-6 inline-flex items-center w-fit px-5 py-2.5 rounded-full font-medium bg-midnight-green text-white hover:bg-midnight-green/90 transition-colors"
              >
                See upcoming events
              </Link>
            </div>

            {/* Pray with us */}
            <div className="bg-antiflash-white rounded-2xl p-8 flex flex-col">
              <span className="text-sm font-semibold uppercase tracking-wider text-mikado-yellow">
                03 · Anytime
              </span>
              <h3 className="mt-3 text-2xl font-bold text-gray-900">
                Share a prayer request
              </h3>
              <p className="mt-3 text-gray-700 flex-1">
                Carry a burden you&apos;d like the PHANET family to stand in the
                gap for? Send it to us — we pray over every request.
              </p>
              {/* TODO: dedicated /prayer page; for now route to chat widget via about */}
              <Link
                href="/about#chairman"
                className="mt-6 inline-flex items-center w-fit px-5 py-2.5 rounded-full font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Get in touch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Closing band */}
      <section className="py-20 bg-midnight-green text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Prayer is not a programme. It&apos;s a posture.
          </h2>
          <p className="mt-6 text-lg text-white/80">
            Whether you join us online or in person, you become part of a
            family committed to standing in the gap for our generation.
          </p>
        </div>
      </section>
    </main>
  );
}
