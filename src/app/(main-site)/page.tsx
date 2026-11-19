import Hero from "./_components/Hero";
import NewHere from "./_components/NewHere";
import FeaturedEvent from "./_components/FeaturedEvent";
import MissionValues from "./_components/MissionValues";
import LatestMessage from "./_components/LatestMessage";
import Testimonials from "./_components/Testimonials";

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
