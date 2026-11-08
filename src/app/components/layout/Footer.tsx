"use client";

import Image from "next/image";
import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";
import DarkDotBackground from "./DarkDotBackground";

// Custom TikTok icon component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-gray-950 text-white">
      <DarkDotBackground />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Logo Section */}
          <div className="col-span-1">
            <Link
              href="/"
              className="inline-flex rounded-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950"
            >
              <Image
                src="/images/logo.png"
                alt="Phanet Logo"
                width={100}
                height={20}
              />
            </Link>
            <p className="mt-4 text-sm text-gray-300">
              Inspiring faith, building community, and transforming lives
              through intercession and the word.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <ul>
              <li>
                <Link
                  href="/about"
                  className="inline-flex min-h-10 items-center rounded-sm text-gray-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/ministries"
                  className="inline-flex min-h-10 items-center rounded-sm text-gray-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
                >
                  Ministries
                </Link>
              </li>
              <li>
                <Link
                  href="/events"
                  className="inline-flex min-h-10 items-center rounded-sm text-gray-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
                >
                  Events
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="inline-flex min-h-10 items-center rounded-sm text-gray-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Connect</h3>
            <ul>
              <li>
                <Link
                  href="/prayer"
                  className="inline-flex min-h-10 items-center rounded-sm text-gray-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
                >
                  Prayer Requests
                </Link>
              </li>
              <li>
                <Link
                  href="/giving"
                  className="inline-flex min-h-10 items-center rounded-sm text-gray-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
                >
                  Give Online
                </Link>
              </li>
              <li>
                <Link
                  href="/volunteer"
                  className="inline-flex min-h-10 items-center rounded-sm text-gray-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
                >
                  Volunteer
                </Link>
              </li>
              <li>
                <Link
                  href="/claim"
                  className="inline-flex min-h-10 items-center rounded-sm text-gray-300 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
                >
                  Claim your member record
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Follow Us</h3>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://web.facebook.com/Phanerosisprayernetworkint"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
              >
                <Facebook aria-hidden="true" className="h-6 w-6" />
                <span className="sr-only">Facebook</span>
              </a>
              <a
                href="https://www.instagram.com/phanet_official/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
              >
                <Instagram aria-hidden="true" className="h-6 w-6" />
                <span className="sr-only">Instagram</span>
              </a>
              <a
                href="https://www.youtube.com/@phanerosisprayernetworkint958"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
              >
                <Youtube aria-hidden="true" className="h-6 w-6" />
                <span className="sr-only">YouTube</span>
              </a>
              <a
                href="https://www.tiktok.com/@phanetsocial"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
              >
                <TikTokIcon className="h-6 w-6" />
                <span className="sr-only">TikTok</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Phanet. All rights reserved.
            </p>
            <div className="mt-4 flex gap-6 md:mt-0">
              <Link
                href="/privacy"
                className="inline-flex min-h-10 items-center rounded-sm text-sm text-gray-400 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="inline-flex min-h-10 items-center rounded-sm text-sm text-gray-400 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 motion-reduce:transition-none"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
