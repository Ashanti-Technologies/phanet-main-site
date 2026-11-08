import { Instrument_Sans } from "next/font/google";

// Portal-only replacement for Inter. Re-binds the same CSS variable the
// `font-sans` utility reads, so apply `${portalSans.variable} font-sans`
// on any root that should use it (incl. Radix portals rendered into <body>).
export const portalSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-brand-sans",
});
