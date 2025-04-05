import Hero from './components/Hero';
import About from './components/About';
import MissionValues from './components/MissionValues';
import GetInvolved from './components/GetInvolved';

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <MissionValues />
      <GetInvolved />
    </main>
  );
}
