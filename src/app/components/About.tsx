'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

export default function About() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-8">
                        About PHANET
                    </h2>
                    <p className="text-lg text-gray-700 leading-relaxed">
                        Phanerosis Prayer Network International, known worldwide as PHANET, is a non-governmental, not-for-profit, non-partisan, non-denominational Christian organization. Among all other ministries, PHANET is uniquely identified as an intercessory ministry. Since 2010, the Network has risen steadily, led by the Holy Spirit and God's Word, with a vision to raise one billion intercessors by 2050.
                    </p>
                </motion.div>
            </div>
        </section>
    );
} 