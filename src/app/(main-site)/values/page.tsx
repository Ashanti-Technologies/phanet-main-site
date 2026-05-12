import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Our Values | Phanerosis Prayer Network",
  description:
    "Five pillars guiding how PHANET prays, gathers, and serves — intercession, teachings, sacrifice, love, and unity.",
};

type Value = {
  number: string;
  slug: string;
  title: string;
  eyebrow: string;
  scripture: string;
  scriptureRef: string;
  paragraphs: string[];
  image: string;
  imageAlt: string;
  accent: string; // bg-* utility for the eyebrow chip
  band: string; // bg-* utility for the section band
};

const values: Value[] = [
  {
    number: "01",
    slug: "intercession",
    title: "Intercession for the Lost",
    eyebrow: "The first pillar",
    scripture:
      "I urge, then, first of all, that petitions, prayers, intercession and thanksgiving be made for all people.",
    scriptureRef: "1 Timothy 2:1",
    paragraphs: [
      "Intercession is the heartbeat of PHANET. We stand in the gap for those who do not yet know Christ, asking the Father to draw them by His Spirit and open their eyes to the gospel.",
      "Every gathering — local, regional, and online — is shaped by this conviction: that prayer for the lost is not a programme but a posture we carry through every day.",
    ],
    image: "/images/landing/happy.webp",
    imageAlt: "Intercessors gathered in prayer",
    accent: "bg-midnight-green text-white",
    band: "bg-white",
  },
  {
    number: "02",
    slug: "teachings",
    title: "Christ-Centred Teachings",
    eyebrow: "The second pillar",
    scripture:
      "For I resolved to know nothing while I was with you except Jesus Christ and him crucified.",
    scriptureRef: "1 Corinthians 2:2",
    paragraphs: [
      "Our teaching is anchored in Scripture and the person of Jesus Christ. We refuse to dilute the gospel for relevance and we refuse to make tradition heavier than the Word.",
      "From Elim Hour to our retreats and chapter studies, every message is tested against the canon and the cross.",
    ],
    image: "/images/landing/founder.webp",
    imageAlt: "PHANET teaching session",
    accent: "bg-crayola text-white",
    band: "bg-antiflash-white",
  },
  {
    number: "03",
    slug: "sacrifice",
    title: "Sacrifice for the Kingdom",
    eyebrow: "The third pillar",
    scripture:
      "Then Jesus said to his disciples, 'Whoever wants to be my disciple must deny themselves and take up their cross and follow me.'",
    scriptureRef: "Matthew 16:24",
    paragraphs: [
      "We believe the kingdom advances on the bent knees and the offered lives of ordinary people. Sacrifice — of time, comfort, money, and ambition — is the cost of carrying His name.",
      "PHANET intercessors give themselves to night watches, fasts, missions, and the quiet labour of prayer that the world rarely sees.",
    ],
    image: "/images/landing/happy2.webp",
    imageAlt: "Hands raised in surrender",
    accent: "bg-cerulean text-white",
    band: "bg-white",
  },
  {
    number: "04",
    slug: "love",
    title: "Love for God and the Brethren",
    eyebrow: "The fourth pillar",
    scripture:
      "A new command I give you: Love one another. As I have loved you, so you must love one another.",
    scriptureRef: "John 13:34",
    paragraphs: [
      "Love is the evidence that we belong to Him. We pursue practical, costly love — for God first, and then for the brothers and sisters He places around us.",
      "It shapes how we welcome the newcomer, how we honour our leaders, and how we keep faith with one another across chapters and continents.",
    ],
    image: "/images/landing/happy.webp",
    imageAlt: "Family of intercessors embracing",
    accent: "bg-black text-white",
    band: "bg-antiflash-white",
  },
  {
    number: "05",
    slug: "unity",
    title: "Unity of the Body of Christ",
    eyebrow: "The fifth pillar",
    scripture:
      "I pray also for those who will believe in me through their message, that all of them may be one, Father, just as you are in me and I am in you.",
    scriptureRef: "John 17:20–21",
    paragraphs: [
      "The body of Christ is one. PHANET does not exist to gather a tribe; we exist to serve the whole Church and to pray her into the unity Jesus prayed for.",
      "Across denominations, generations, and geographies, we labour for a kingdom witness that the world cannot dismiss because it is undivided.",
    ],
    image: "/images/landing/happy2.webp",
    imageAlt: "Diverse believers worshipping together",
    accent: "bg-mikado-yellow text-gray-900",
    band: "bg-white",
  },
];

export default function ValuesPage() {
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
            What we stand on
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-4">
            Our Values
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            Five pillars that shape how we pray, gather, and serve.
          </p>

          {/* Anchor nav */}
          <nav
            aria-label="Values quick links"
            className="mt-10 flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto"
          >
            {values.map((v) => (
              <Link
                key={v.slug}
                href={`#${v.slug}`}
                className="px-4 py-2 rounded-full text-sm text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
              >
                {v.title}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Five value sections */}
      {values.map((value, index) => {
        const reverse = index % 2 === 1;
        return (
          <section
            key={value.slug}
            id={value.slug}
            className={`${value.band} scroll-mt-24 py-20 sm:py-24`}
          >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div
                className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                  reverse ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
                  <Image
                    src={value.image}
                    alt={value.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 50vw, 100vw"
                  />
                </div>

                {/* Copy */}
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${value.accent}`}
                  >
                    Value {value.number}
                  </span>
                  <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
                    {value.title}
                  </h2>
                  <blockquote className="mt-6 border-l-4 border-gray-200 pl-5 italic text-gray-700">
                    “{value.scripture}”
                    <footer className="not-italic text-sm text-gray-500 mt-2">
                      — {value.scriptureRef}
                    </footer>
                  </blockquote>
                  {value.paragraphs.map((p, i) => (
                    <p
                      key={i}
                      className="mt-5 text-base sm:text-lg text-gray-700 leading-relaxed"
                    >
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {/* Closing CTA */}
      <section className="bg-gray-950 py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Walk these out with us.
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Join Elim Hour every Sunday or find an upcoming gathering near you.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/join"
              className="px-6 py-3 rounded-full font-medium bg-crayola text-white hover:bg-crayola/90 transition-colors"
            >
              Become an intercessor
            </Link>
            <Link
              href="/events"
              className="px-6 py-3 rounded-full font-medium bg-white/10 text-white border border-white/30 hover:bg-white/20 transition-colors"
            >
              Find an event
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
