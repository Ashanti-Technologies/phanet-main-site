'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';

const coreValues = [
    {
        title: "Intercession for the Lost",
        icon: "/images/icons/prayer.svg",
        description: "Dedicated to praying for those who have not yet found Christ"
    },
    {
        title: "Christ-Centred Teachings",
        icon: "/images/icons/bible.svg",
        description: "Rooted in biblical truth and the teachings of Jesus"
    },
    {
        title: "Sacrifice for the Kingdom",
        icon: "/images/icons/cross.svg",
        description: "Committed to serving God's purpose above all else"
    },
    {
        title: "Love for God and the Brethren",
        icon: "/images/icons/heart.svg",
        description: "Building a community of love and support"
    },
    {
        title: "Unity of the Body of Christ",
        icon: "/images/icons/hands.svg",
        description: "Working together as one in Christ"
    }
];

export default function MissionValues() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section className="py-20 bg-blue-50 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-[url('/images/pattern.png')] bg-repeat" />
            </div>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl mx-auto"
                >
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-6">
                            Our Mission & Core Values
                        </h2>
                        <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full" />
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="bg-white rounded-2xl p-8 shadow-lg mb-12 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full opacity-20" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100 rounded-full opacity-20" />
                        <h3 className="text-2xl font-semibold text-blue-800 mb-4">Mission</h3>
                        <p className="text-lg text-gray-700 leading-relaxed">
                            To reach the unreached, strengthen the weak, and support the strong through intercession, fellowship, study of the Word, and witnessing.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {coreValues.map((value, index) => (
                            <motion.div
                                key={value.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 rounded-full opacity-20" />
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                        <Image
                                            src={value.icon}
                                            alt={value.title}
                                            width={24}
                                            height={24}
                                            className="text-blue-600 group-hover:text-white"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-blue-800 mb-2">{value.title}</h3>
                                        <p className="text-gray-600">{value.description}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
} 