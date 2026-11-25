import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/database";
import ElimHourLiveCard from "../_components/ElimHourLiveCard";
import LatestMessage from "../_components/LatestMessage";
import Testimonials from "../_components/Testimonials";
import AskElimButton from "./_components/AskElimButton";
import PlanVisitForm from "./_components/PlanVisitForm";
import { getFirstVisitOptions } from "@/actions/guests";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/animate-ui/components/radix/accordion";

export const metadata: Metadata = {
  title: "New Here? | Phanerosis Prayer Network",
  description:
    "New to PHANET? Here's who we are, what to expect at your first Elim Hour, and how to find your place in a global family of intercessors.",
  alternates: { canonical: "/new-here" },
};

const REASSURANCES = [
  "Not a church, so you keep your own",
  "Online every Sunday",
  "Free, with no sign-up",
];

const EXPECT = [
  { label: "When", text: "Every Sunday at 7:00 PM GMT, for about 90 minutes." },
  {
    label: "Where",
    text: "Live on YouTube. Watch on any phone, tablet or computer, no account needed.",
  },
  {
    label: "What happens",
    text: "Worship, a message from the Word, and intercession together.",
  },
  {
    label: "Who leads",
    text: "Our Chairman, Dr. Godfred Bonnah Nkansah, and other ministers.",
  },
  {
    label: "You",
    text: "Come as you are. Pray along, take notes, or simply listen.",
  },
];

const PATHS = [
  {
    eyebrow: "Students",
    title: "Your campus, your chapter",
    text: "PHANET has chapters on university and senior high school campuses. SHARP Conference, Phanefest and GIYA are built for students. No chapter on your campus yet? We'll help you start one.",
    href: "/events",
    cta: "See upcoming events",
    accent: "text-crayola",
  },
  {
    eyebrow: "Outside Ghana",
    title: "Family across time zones",
    text: "Elim Hour gathers Phaneteers from across the world every Sunday, and there are chapters in the UK, North America and beyond.",
    href: "#elim-hour",
    cta: "Join this Sunday",
    accent: "text-cerulean",
  },
  {
    eyebrow: "Women",
    title: "Women in travail",
    text: "The PHANET Women's Division gathers women for intercession and teaching through Women in Travail and the Junia Camp.",
    href: "/events",
    cta: "See upcoming events",
    accent: "text-midnight-green",
  },
  {
    eyebrow: "Church leaders",
    title: "Strengthening every church",
    text: "PHANET is non-denominational. We raise intercessors who stay rooted in their own churches, and we stand with the whole Body of Christ.",
    href: "/about",
    cta: "Our story",
    accent: "text-mikado-yellow",
  },
];

const STEPS = [
  {
    title: "Come",
    text: "Join Elim Hour this Sunday. Watch, worship and pray along.",
    href: "#plan-your-visit",
    cta: "Plan your first Sunday",
  },
  {
    title: "Connect",
    text: "Meet the Phamily in person at a Night of Solemnities, camp or conference.",
    href: "/events",
    cta: "Upcoming events",
  },
  {
    title: "Commit",
    text: "Become a Phaneteer and be part of a chapter near you.",
    href: "/membership/apply",
    cta: "Apply for membership",
  },
  {
    title: "Contribute",
    text: "Serve in a department such as the Engine Room, Protocol or Heirs of Zion, and give towards the vision.",
    href: "/give",
    cta: "Give",
  },
];

const FAQS = [
  {
    q: "Is PHANET a church? Do I have to leave mine?",
    a: "No. PHANET is a non-denominational, non-partisan intercessory network, not a church. You stay in your own church and pray with us too. Phaneteers come from many denominations.",
  },
  {
    q: "Does it cost anything?",
    a: "Elim Hour is free. Just open YouTube. Some camps and conferences have a registration fee, which is shown on each event's page.",
  },
  {
    q: "Do I need an account or an app?",
    a: "No. Elim Hour streams live on YouTube, so you can watch on any phone, tablet or computer.",
  },
  {
    q: "What time is 7 PM GMT where I live?",
    a: "The countdown on this page counts down to the next service wherever you are. If you tap “Add to calendar”, your calendar converts the time for you.",
  },
  {
    q: "I'm not a seasoned prayer warrior. Can I still come?",
    a: "Yes. You don't need experience to belong here. You just need to show up. We learn to pray by praying together.",
  },
  {
    q: "Is PHANET only in Ghana?",
    a: "No. PHANET began in Ghana and has a strong presence there, with chapters in the diaspora including the UK and North America. Our vision is to raise one billion intercessors across the world by 2050.",
  },
  {
    q: "How do I become a member?",
    a: "Apply online through our membership form, and we'll connect you with a chapter.",
    href: "/membership/apply",
    cta: "Apply for membership",
  },
  {
    q: "Can I start a chapter at my school or university?",
    a: "Yes. Reach out to us and we'll connect you with the coordinators who will guide you through it.",
  },
];

const GLOSSARY = [
  { term: "Phaneteer", meaning: "A member of PHANET." },
  { term: "The Phamily", meaning: "What we call our community." },
  {
    term: "Phanerosis",
    meaning: "Greek for “manifestation”: God's glory revealed through prayer.",
  },
  {
    term: "“Manifest!” “His glory!”",
    meaning: "Our call and response. You'll hear it a lot.",
  },
  { term: "Elim Hour", meaning: "Our weekly online service, every Sunday evening." },
  {
    term: "Night of Solemnities (NoS)",
    meaning: "A monthly all-night prayer meeting held in every regional chapter.",
  },
  {
    term: "Heaven on Earth (HoE)",
    meaning: "Our biggest gathering of the year, an end-of-year camp every December.",
  },
  { term: "Prayerthon", meaning: "30 days of prayer every September." },
  { term: "Engine Room", meaning: "Our intercessory prayer department." },
];

/** Admin-written note (Content → Homepage, key "new-here-chairman"). */
async function getChairmanNote() {
  return prisma.homepageSection.findFirst({
    where: { key: "new-here-chairman", status: "PUBLISHED" },
    select: { title: true, bodyHtml: true },
  });
}

export default async function NewHerePage() {
  const [chairmanNote, visitOptions] = await Promise.all([getChairmanNote(), getFirstVisitOptions()]);

  return (
    <main>
      {/* Welcome */}
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
            New here?
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-5">
            Welcome to the Phamily.
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            Phanerosis Prayer Network International (PHANET) is a
            non-denominational network of intercessors: believers from every
            church, praying together for the world. It began in 2010 with a
            handful of friends praying on Atwea Mountain, and it&apos;s now a
            family across the globe.
          </p>
          <ul className="mt-8 flex flex-wrap justify-center gap-3">
            {REASSURANCES.map((item) => (
              <li
                key={item}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white"
              >
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <a
              href="#plan-your-visit"
              className="px-6 py-3 rounded-full font-medium bg-crayola text-white hover:bg-crayola/90 transition-colors"
            >
              Plan your first Sunday
            </a>
            <a
              href="#faq"
              className="px-6 py-3 rounded-full font-medium border-2 border-white/80 text-white hover:bg-white/10 transition-colors"
            >
              Common questions
            </a>
          </div>
        </div>
      </section>

      {/* Your first Elim Hour */}
      <section id="elim-hour" className="scroll-mt-24 py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-crayola text-white">
              Your first visit
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-gray-900">
              What to expect at Elim Hour
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Our weekly service is where most people meet PHANET for the first
              time. You can join from wherever you are.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <ElimHourLiveCard />
            <dl className="divide-y divide-gray-200 rounded-2xl bg-antiflash-white px-6 sm:px-8">
              {EXPECT.map((item) => (
                <div key={item.label} className="py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="font-semibold text-gray-900">{item.label}</dt>
                  <dd className="mt-1 text-gray-700 sm:col-span-2 sm:mt-0">
                    {item.text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Plan your first Sunday */}
      <section id="plan-your-visit" className="scroll-mt-24 py-20 bg-antiflash-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-10 lg:gap-16 items-start max-w-6xl">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-crayola text-white">
              Plan your visit
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-gray-900">
              Plan your first Sunday
            </h2>
            <p className="mt-4 text-lg text-gray-700">
              Tell us you&apos;re coming and we&apos;ll make sure you don&apos;t
              miss it.
            </p>
            <ul className="mt-6 space-y-3 text-gray-700">
              <li>• A reminder on the day, with the YouTube link</li>
              <li>• A welcome from your nearest chapter</li>
              <li>• Prayer for anything you&apos;re carrying</li>
            </ul>
          </div>
          <PlanVisitForm sundays={visitOptions.sundays} chapters={visitOptions.chapters} />
        </div>
      </section>

      {/* A note from the Chairman */}
      <section id="chairman" className="scroll-mt-24 py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,18rem)_1fr] gap-10 lg:gap-16 items-center max-w-5xl mx-auto">
            <div className="relative aspect-square w-full max-w-xs mx-auto rounded-2xl overflow-hidden shadow-xl">
              <Image
                src="/images/landing/founder.webp"
                alt="Dr. Godfred Bonnah Nkansah"
                fill
                className="object-cover"
                sizes="(min-width: 768px) 18rem, 80vw"
              />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-midnight-green text-white">
                A note from the Chairman
              </span>
              <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-gray-900">
                {chairmanNote?.title ?? "Dr. Godfred Bonnah Nkansah"}
              </h2>
              {chairmanNote ? (
                <div
                  className="rich-text mt-6 text-lg text-gray-700"
                  dangerouslySetInnerHTML={{ __html: chairmanNote.bodyHtml }}
                />
              ) : (
                <p className="mt-6 text-lg text-gray-700 leading-relaxed">
                  Dr. Godfred Bonnah Nkansah is the founder and chairman of
                  PHANET. He carries a deep burden for prayer and a clear
                  vision: to see one billion intercessors raised up across the
                  earth.
                </p>
              )}
              {chairmanNote && (
                <p className="mt-6 font-semibold text-gray-900">
                  Dr. Godfred Bonnah Nkansah
                  <span className="block text-sm font-normal text-gray-500">
                    Founder &amp; Chairman, PHANET
                  </span>
                </p>
              )}
              <Link
                href="/about"
                className="mt-6 inline-flex items-center px-5 py-2.5 rounded-full font-medium text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              >
                Read our story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Find your place */}
      <section className="py-20 bg-antiflash-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-cerulean text-white">
              Start here
            </span>
            <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-gray-900">
              Find your place
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PATHS.map((path) => (
              <div key={path.eyebrow} className="bg-white rounded-2xl p-7 flex flex-col">
                <span className={`text-sm font-semibold uppercase tracking-wider ${path.accent}`}>
                  {path.eyebrow}
                </span>
                <h3 className="mt-3 text-xl font-bold text-gray-900">{path.title}</h3>
                <p className="mt-3 text-gray-700 flex-1">{path.text}</p>
                <Link
                  href={path.href}
                  className="mt-6 text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-crayola"
                >
                  {path.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Watch before you come */}
      <LatestMessage />

      {/* Next steps */}
      <section className="py-20 bg-midnight-green text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <span className="text-white/70 text-sm font-semibold uppercase tracking-widest">
              Next steps
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold">
              From first visit to family
            </h2>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl bg-white/10 p-7 flex flex-col">
                <span className="text-sm font-semibold text-white/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 text-2xl font-bold">{step.title}</h3>
                <p className="mt-3 text-white/85 flex-1">{step.text}</p>
                <Link
                  href={step.href}
                  className="mt-6 inline-flex w-fit px-5 py-2.5 rounded-full text-sm font-medium bg-white text-gray-900 hover:bg-white/90 transition-colors"
                >
                  {step.cta}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <Testimonials />

      {/* Questions + glossary */}
      <section id="faq" className="scroll-mt-24 py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 lg:gap-16">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Common questions
            </h2>
            <Accordion type="single" collapsible className="mt-8">
              {FAQS.map((faq) => (
                <AccordionItem key={faq.q} value={faq.q} className="border-gray-200">
                  <AccordionTrigger className="text-base sm:text-lg font-semibold text-gray-900">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-gray-700 leading-relaxed">
                    {faq.a}
                    {faq.href && (
                      <>
                        {" "}
                        <Link href={faq.href} className="font-semibold text-crayola underline underline-offset-4">
                          {faq.cta}
                        </Link>
                      </>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <aside className="rounded-2xl bg-antiflash-white p-7 sm:p-8 h-fit">
            <h2 className="text-2xl font-bold text-gray-900">Words you&apos;ll hear</h2>
            <dl className="mt-6 space-y-4">
              {GLOSSARY.map((item) => (
                <div key={item.term}>
                  <dt className="font-semibold text-gray-900">{item.term}</dt>
                  <dd className="text-gray-700">{item.meaning}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      {/* Closing */}
      <section className="py-20 bg-gray-950 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">See you on Sunday.</h2>
          <p className="mt-6 text-lg text-white/80">
            Still have a question? Elim, our assistant, can tell you anything
            about PHANET, any time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <AskElimButton className="px-6 py-3 rounded-full font-medium bg-crayola text-white hover:bg-crayola/90 transition-colors" />
            <a
              href="#plan-your-visit"
              className="px-6 py-3 rounded-full font-medium border-2 border-white/80 text-white hover:bg-white/10 transition-colors"
            >
              Plan your first Sunday
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
