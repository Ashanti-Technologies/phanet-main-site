'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function GetInvolved() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section className="py-20 bg-white relative overflow-hidden">
            {/* Background pattern */}
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
                                src="/images/hoe5.jpg"
                                alt="PHANET Community"
                                fill
                                className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        </div>
                        <motion.div
                            className="absolute -bottom-6 -right-6 bg-midnight-green text-white p-6 rounded-xl shadow-xl"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.8, delay: 0.6 }}
                        >
                            <p className="text-4xl font-bold">1B</p>
                            <p className="text-sm">Intercessors Goal</p>
                        </motion.div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-center lg:text-left"
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-6">
                            Join Our Global Network
                        </h2>
                        <p className="text-lg text-gray-700 mb-8">
                            Be part of something greater. Join our community of intercessors and make a difference in the world through prayer.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-block"
                            >
                                <Link
                                    href="/join"
                                    className="inline-block bg-crayola hover:bg-crayola/90 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300"
                                >
                                    Get Involved Today
                                </Link>
                            </motion.div>
                            {/* <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-block"
                            >
                                <a
                                    href="/prayer-requests"
                                    className="inline-block bg-transparent border border-crayola text-crayola font-semibold px-8 py-4 rounded-lg transition-colors duration-300 hover:bg-blue-50"
                                >
                                    Submit Prayer Request
                                </a>
                            </motion.div> */}
                        </div>

                        <p className="mt-6 text-sm text-gray-500">
                            By joining, you&apos;ll receive regular prayer updates and resources
                        </p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
} 
