import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import ChatWidget from "../components/chat/ChatWidget";
import FeaturedEventBanner from "./_components/FeaturedEventBanner";
import { getFeaturedEvent } from "@/lib/events-data";

// Event saves revalidate this layout; hourly refresh drops featured events once they end.
export const revalidate = 3600;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const featured = await getFeaturedEvent();
  return (
    <div className="public-site contents">
      <Header banner={featured && <FeaturedEventBanner event={featured} />} />
      {children}
      <Analytics />
      <SpeedInsights />
      <Footer />
      <ChatWidget />
    </div>
  );
}
