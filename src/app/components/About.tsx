'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';

export default function About() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section className="py-20 bg-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-[url('/images/pattern.png')] bg-repeat" />
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <motion.div
                        ref={ref}
                        initial={{ opacity: 0, x: -50 }}
                        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative"
                    >
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl">
                            <Image
                                src="/images/about.jpg"
                                alt="PHANET Community"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                        <motion.div
                            className="absolute -bottom-6 -right-6 bg-mikado-yellow text-white p-6 rounded-xl shadow-xl"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                        >
                            <p className="text-4xl font-bold">2010</p>
                            <p className="text-sm">Founded</p>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-6">
                            About Phanerosis Prayer Network
                        </h2>
                        <p className="text-lg text-gray-700 leading-relaxed mb-8">
                            Phanerosis Prayer Network International - PHANET, known worldwide as PHANET, is a non-governmental, not-for-profit, non-partisan, non-denominational Christian organization. Among all other ministries, PHANET is uniquely identified as an intercessory ministry.
                        </p>
                        <p className="text-lg text-gray-700 leading-relaxed">
                            Since 2010, the Network has risen steadily, led by the Holy Spirit and God&apos;s Word, with a vision to raise one billion intercessors by 2050.
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
} 