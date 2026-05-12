import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "About | Phanerosis Prayer Network",
  description:
    "About the Phanerosis Prayer Network International — our story, our chairman, and our mission to raise one billion intercessors.",
};

export default function AboutPage() {
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
            About PHANET
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-4">
            Raising one billion intercessors.
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            A global family of prayer warriors carrying the burden of the
            kingdom — one watch at a time.
          </p>
        </div>
      </section>

      {/* Our story */}
      <section id="story" className="scroll-mt-24 py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-midnight-green text-white">
            Our story
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-gray-900">
            From a single prayer meeting to a global network.
          </h2>
          {/* TODO: real founding narrative */}
          <p className="mt-6 text-lg text-gray-700 leading-relaxed">
            The Phanerosis Prayer Network International began with a small
            group of intercessors gathering to pray for revival in Ghana. What
            started in one nation has grown into a movement spanning chapters
            across Africa, Europe, and North America.
          </p>
          <p className="mt-4 text-lg text-gray-700 leading-relaxed">
            We believe the answer to the problems of our generation is found at
            the place of prayer. That conviction shapes everything we do.
          </p>
        </div>
      </section>

      {/* Chairman */}
      <section id="chairman" className="scroll-mt-24 py-20 bg-antiflash-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-xl max-w-md mx-auto lg:mx-0">
              <Image
                src="/images/landing/founder.webp"
                alt="Dr. Godfred Bonnah Nkansah"
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-crayola text-white">
                Meet the chairman
              </span>
              <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-gray-900">
                Dr. Godfred Bonnah Nkansah
              </h2>
              {/* TODO: chairman bio */}
              <p className="mt-6 text-lg text-gray-700 leading-relaxed">
                Dr. Godfred Bonnah Nkansah is the founder and chairman of the
                Phanerosis Prayer Network International. He carries a deep
                burden for prayer and a clear vision: to see one billion
                intercessors raised up across the earth.
              </p>
              <p className="mt-4 text-lg text-gray-700 leading-relaxed">
                Under his leadership, PHANET has grown into a global community
                of believers committed to the ministry of intercession and the
                spread of the gospel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section id="mission" className="scroll-mt-24 py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-cerulean text-white">
            Our mission
          </span>
          <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-gray-900">
            To reach the unreached, strengthen the weak, and support the strong.
          </h2>
          <p className="mt-6 text-lg text-gray-700 leading-relaxed">
            We pursue this mission through four streams: intercession,
            fellowship, the study of the Word, and witnessing. Each is rooted
            in our five core values.
          </p>
          <div className="mt-8">
            <Link
              href="/values"
              className="inline-flex items-center px-6 py-3 rounded-full font-medium bg-crayola text-white hover:bg-crayola/90 transition-colors"
            >
              Explore our values
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
