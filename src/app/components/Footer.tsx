'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Instagram, Youtube } from 'lucide-react';

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
        >
            <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
        </svg>
    );
}

export default function Footer() {
    return (
        <footer className="bg-midnight-green text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Logo Section */}
                    <div className="col-span-1">
                        <Link href="/" className="inline-block">
                            <Image
                                src="/images/logo.png"
                                alt="Phanet Logo"
                                width={120}
                                height={40}
                            />
                        </Link>
                        <p className="mt-4 text-gray-300 text-sm">
                            Inspiring faith, building community, and transforming lives through intercession and the word.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/about" className="text-gray-300 hover:text-white transition-colors">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/ministries" className="text-gray-300 hover:text-white transition-colors">
                                    Ministries
                                </Link>
                            </li>
                            <li>
                                <Link href="/events" className="text-gray-300 hover:text-white transition-colors">
                                    Events
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="text-gray-300 hover:text-white transition-colors">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Connect</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/prayer" className="text-gray-300 hover:text-white transition-colors">
                                    Prayer Requests
                                </Link>
                            </li>
                            <li>
                                <Link href="/giving" className="text-gray-300 hover:text-white transition-colors">
                                    Give Online
                                </Link>
                            </li>
                            <li>
                                <Link href="/volunteer" className="text-gray-300 hover:text-white transition-colors">
                                    Volunteer
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
                        <div className="flex flex-wrap gap-4">
                            <a
                                href="https://web.facebook.com/Phanerosisprayernetworkint"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-300 hover:text-white transition-colors duration-300"
                            >
                                <Facebook className="w-6 h-6" />
                                <span className="sr-only">Facebook</span>
                            </a>
                            <a
                                href="https://www.instagram.com/phanet_official/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-300 hover:text-white transition-colors duration-300"
                            >
                                <Instagram className="w-6 h-6" />
                                <span className="sr-only">Instagram</span>
                            </a>
                            <a
                                href="https://www.youtube.com/@phanerosisprayernetworkint958"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-300 hover:text-white transition-colors duration-300"
                            >
                                <Youtube className="w-6 h-6" />
                                <span className="sr-only">YouTube</span>
                            </a>
                            <a
                                href="https://www.tiktok.com/@phanetsocial"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-300 hover:text-white transition-colors duration-300"
                            >
                                <TikTokIcon className="w-6 h-6" />
                                <span className="sr-only">TikTok</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-700 mt-12 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <p className="text-gray-400 text-sm">
                            © {new Date().getFullYear()} Phanet. All rights reserved.
                        </p>
                        <div className="flex space-x-6 mt-4 md:mt-0">
                            <Link href="/privacy" className="text-gray-400 hover:text-white text-sm">
                                Privacy Policy
                            </Link>
                            <Link href="/terms" className="text-gray-400 hover:text-white text-sm">
                                Terms of Service
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
} 