import Link from "next/link";

export const metadata = {
  title: "Programmes | Phanerosis Prayer Network",
  description:
    "The programmes through which PHANET pursues its mission — Elim Hour, retreats, prayer schools, and chapter gatherings.",
};

type Programme = {
  slug: string;
  name: string;
  cadence: string;
  description: string;
  href: string;
  cta: string;
  accent: string;
};

const programmes: Programme[] = [
  {
    slug: "elim-hour",
    name: "Elim Hour",
    cadence: "Weekly · Sundays · 7 PM GMT",
    description:
      "Our flagship online gathering for worship, the Word, and intercession together.",
    href: "/messages",
    cta: "Watch live",
    accent: "bg-crayola text-white",
  },
  {
    slug: "annual-conference",
    name: "Annual Prayer Conference",
    cadence: "Yearly · May",
    description:
      "Three days of national-scale prayer, prophetic ministrations, and apostolic teaching.",
    href: "/events",
    cta: "View upcoming",
    accent: "bg-midnight-green text-white",
  },
  {
    slug: "night-of-solemnities",
    name: "Night of Solemnities",
    cadence: "Quarterly",
    description:
      "Solemn assemblies for fasting, consecration, and intercession across cities.",
    href: "/events",
    cta: "View upcoming",
    accent: "bg-cerulean text-white",
  },
  {
    slug: "chapter-gatherings",
    name: "Chapter Gatherings",
    cadence: "Monthly",
    description:
      "Local and regional chapters meeting for prayer, fellowship, and kingdom alignment.",
    href: "/events",
    cta: "Find your chapter",
    accent: "bg-mikado-yellow text-gray-900",
  },
];

export default function ProgrammesPage() {
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
            What we do
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-4">
            Our Programmes
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            The rhythms through which PHANET prays, gathers, and equips.
          </p>
        </div>
      </section>

      {/* Programme grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {programmes.map((p) => (
              <div
                key={p.slug}
                className="bg-antiflash-white rounded-2xl p-8 flex flex-col"
              >
                <span
                  className={`inline-block w-fit px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${p.accent}`}
                >
                  {p.cadence}
                </span>
                <h3 className="mt-5 text-2xl sm:text-3xl font-bold text-gray-900">
                  {p.name}
                </h3>
                <p className="mt-3 text-gray-700 flex-1">{p.description}</p>
                <Link
                  href={p.href}
                  className="mt-6 inline-flex items-center w-fit px-5 py-2.5 rounded-full font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
          {/* TODO: dedicated detail pages per programme */}
        </div>
      </section>
    </main>
  );
}
