import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import ChatWidget from "../components/chat/ChatWidget";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      {children}
      <Analytics />
      <SpeedInsights />
      <Footer />
      <ChatWidget />
    </>
  );
}
