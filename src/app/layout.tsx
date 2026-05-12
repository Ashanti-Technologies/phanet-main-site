import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import JsonLd from "./components/JsonLd";
import { APP_CONFIG } from "@/constants";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import ReactQueryProvider from "./components/providers/ReactQueryProvider";

const dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(APP_CONFIG.siteUrl),
  title: {
    default: "Phanerosis Network International - PHANET",
    template: "%s | Phanerosis Network International - PHANET",
  },
  description: "Raising One Billion Intercessors Worldwide",
  keywords: [
    "prayer",
    "intercession",
    "faith",
    "spiritual",
    "community",
    "church",
    "phanerosis",
    "phanet",
    "phanerosis prayer network",
  ],
  authors: [{ name: "Phanet" }],
  creator: "Phanerosis Network International - PHANET",
  publisher: "Phanerosis Network International - PHANET",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_CONFIG.siteUrl,
    siteName: "Phanet",
    title: "Phanet",
    description: "Raising One Billion Intercessors Worldwide",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Phanet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Phanerosis Network International - PHANET",
    description: "Raising One Billion Intercessors Worldwide",
    images: ["/api/og"],
    creator: "@phanet",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "MoWnqIm8MthleETNIrHs6bgC0zjscBKFzf01ufh_JdA", // Add your Google verification code
  },
};

// Structured data for the website
const jsonLdData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Phanet",
  alternateName: "Phanerosis Prayer Network International",
  url: APP_CONFIG.siteUrl,
  logo: `${APP_CONFIG.siteUrl}/images/logo.png`,
  description: "Raising One Billion Intercessors Worldwide",
  sameAs: [
    "https://web.facebook.com/Phanerosisprayernetworkint",
    "https://twitter.com/phanet",
    "https://instagram.com/phanet_official",
  ],
  address: {
    "@type": "PostalAddress",
    addressCountry: "GH",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: APP_CONFIG.contactEmail,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="google-tag-manager" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-WNPLHGTG');
          `}
        </Script>
        <JsonLd data={jsonLdData} />
        <link rel="canonical" href={APP_CONFIG.siteUrl} />
      </head>
      <body className={`${dmSans.className} antialiased`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WNPLHGTG"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <ReactQueryProvider>{children}</ReactQueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
