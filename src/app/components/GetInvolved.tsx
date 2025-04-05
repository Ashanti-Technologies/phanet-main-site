'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

export default function GetInvolved() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-2xl mx-auto text-center"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-6">
                        Join Our Global Prayer Network
                    </h2>
                    <p className="text-lg text-gray-700 mb-8">
                        Be part of something greater. Join our community of intercessors and make a difference in the world through prayer.
                    </p>

                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-block"
                    >
                        <a
                            href="/join"
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300"
                        >
                            Get Involved Today
                        </a>
                    </motion.div>

                    <p className="mt-6 text-sm text-gray-500">
                        By joining, you'll receive regular prayer updates and resources
                    </p>
                </motion.div>
            </div>
        </section>
    );
} 