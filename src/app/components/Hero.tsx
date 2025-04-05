'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Background with gradient and subtle motion */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-blue-50 to-blue-100"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
            >
                <motion.div
                    className="absolute inset-0 bg-[url('/images/hero-bg.jpg')] bg-cover bg-center opacity-20"
                    animate={{
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                />
            </motion.div>

            {/* Content */}
            <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
                <motion.h1
                    className="text-4xl sm:text-5xl md:text-6xl font-bold text-blue-900 mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    Raising One Billion Intercessors Worldwide
                </motion.h1>

                <motion.p
                    className="text-xl sm:text-2xl text-blue-800 mb-8 max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                >
                    Join us in our mission to transform lives through prayer and intercession
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                >
                    <Link
                        href="/join"
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300 transform hover:scale-105"
                    >
                        Join the Mission
                    </Link>
                </motion.div>
            </div>
        </section>
    );
} 