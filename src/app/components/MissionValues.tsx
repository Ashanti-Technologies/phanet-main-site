'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const coreValues = [
    "Intercession for the Lost",
    "Christ-Centred Teachings",
    "Sacrifice for the Kingdom",
    "Love for God and the Brethren",
    "Unity of the Body of Christ",
];

export default function MissionValues() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section className="py-20 bg-blue-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-4xl mx-auto"
                >
                    <h2 className="text-3xl sm:text-4xl font-bold text-blue-900 mb-8 text-center">
                        Our Mission & Core Values
                    </h2>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="bg-white rounded-lg p-8 shadow-lg mb-12"
                    >
                        <h3 className="text-2xl font-semibold text-blue-800 mb-4">Mission</h3>
                        <p className="text-lg text-gray-700 leading-relaxed">
                            To reach the unreached, strengthen the weak, and support the strong through intercession, fellowship, study of the Word, and witnessing.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {coreValues.map((value, index) => (
                            <motion.div
                                key={value}
                                initial={{ opacity: 0, y: 20 }}
                                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                                className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300"
                            >
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mr-3" />
                                    <h3 className="text-lg font-semibold text-blue-800">{value}</h3>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
} 