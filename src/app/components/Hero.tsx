'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import HeroSlider from './HeroSlider';

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <HeroSlider />

            {/* Content overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="mb-12"
                    >
                        <Image
                            src="/images/logo.png"
                            alt="PHANET Logo"
                            width={200}
                            height={200}
                            className="mx-auto mb-8"
                        />
                    </motion.div>

                    <motion.h1
                        className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        Raising One Billion<br />
                        <span className="text-blue-300">Intercessors Worldwide</span>
                    </motion.h1>

                    <motion.p
                        className="text-xl sm:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                    >
                        Join us in our mission to transform lives through prayer and intercession
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <Link
                            href="/join"
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300 transform hover:scale-105"
                        >
                            Join the Mission
                        </Link>
                        <Link
                            href="/about"
                            className="inline-block bg-transparent border-2 border-white text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300 transform hover:scale-105 hover:bg-white/10"
                        >
                            Learn More
                        </Link>
                    </motion.div>

                </div>
            </div>
        </section>
    );
} 