import Hero from "./_components/Hero";
import NewHere from "./_components/NewHere";
import About from "./_components/About";
import MissionValues from "./_components/MissionValues";
import LatestMessage from "./_components/LatestMessage";
import GetInvolved from "./_components/GetInvolved";

export default function Home() {
  return (
    <main>
      <Hero />
      <NewHere />
      <MissionValues />
      <LatestMessage />
      {/* <About />
      <GetInvolved /> */}
    </main>
  );
}
