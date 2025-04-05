import Hero from './components/Hero';
import About from './components/About';
import MissionValues from './components/MissionValues';
import GetInvolved from './components/GetInvolved';
import Footer from './components/Footer';

export default function Home() {
  return (
    <main>
      <Hero />
      <About />
      <MissionValues />
      <GetInvolved />
      <Footer />
    </main>
  );
}
