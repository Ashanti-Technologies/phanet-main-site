import type { Metadata } from "next";
import Hero from "./_components/Hero";
import NewHere from "./_components/NewHere";
import FeaturedEvent from "./_components/FeaturedEvent";
import MissionValues from "./_components/MissionValues";
import LatestMessage from "./_components/LatestMessage";
import Testimonials from "./_components/Testimonials";

// Canonical lives here, not in the root layout — a root-level one marks every page as a duplicate of the homepage.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <main>
      <Hero />
      <FeaturedEvent />
      <NewHere />
      <MissionValues />
      <LatestMessage />
      <Testimonials />
    </main>
  );
}
