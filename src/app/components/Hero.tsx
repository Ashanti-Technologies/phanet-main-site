'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const slides = [
    {
        id: 1,
        image: '/images/slider/giya1.jpg',
        title: 'Global Prayer Movement',
        subtitle: 'Join millions in prayer for the nations',
        cta: {
            primary: {
                text: 'Get connected',
                href: '/join',
            },
            secondary: {
                text: 'Learn More',
                href: '/about',
            },
        },
    },
    {
        id: 2,
        image: '/images/slider/hoe1.jpg',
        title: 'United in Christ',
        subtitle: 'Building a community of intercessors',
        cta: {
            primary: {
                text: 'Find a location',
                href: '/groups',
            },
            secondary: {
                text: 'Our Vision',
                href: '/vision',
            },
        },
    },
    {
        id: 3,
        image: '/images/slider/hoe2.jpg',
        title: 'Transform Lives',
        subtitle: 'Through the power of prayer',
        cta: {
            primary: {
                text: 'Watch sermons',
                href: '/sermons',
            },
            secondary: {
                text: 'Resources',
                href: '/resources',
            },
        },
    },
];

export default function Hero() {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            <div className="relative w-full h-screen overflow-hidden">
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, ease: "easeInOut" }}
                        className="absolute inset-0"
                    >
                        <Image
                            src={slides[currentSlide].image}
                            alt={slides[currentSlide].title}
                            fill
                            className="object-cover"
                            priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />
                    </motion.div>

                    <motion.div
                        key={`content-${currentSlide}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
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
                                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                            >
                                {slides[currentSlide].title}
                            </motion.h1>

                            <motion.p
                                className="text-xl sm:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                            >
                                {slides[currentSlide].subtitle}
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 1, delay: 0.9, ease: "easeOut" }}
                                className="flex flex-col sm:flex-row gap-4 justify-center"
                            >
                                <Link
                                    href={slides[currentSlide].cta.primary.href}
                                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300 transform hover:scale-105"
                                >
                                    {slides[currentSlide].cta.primary.text}
                                </Link>
                                <Link
                                    href={slides[currentSlide].cta.secondary.href}
                                    className="inline-block bg-transparent border-2 border-white text-white font-semibold px-8 py-4 rounded-lg transition-colors duration-300 transform hover:scale-105 hover:bg-white/10"
                                >
                                    {slides[currentSlide].cta.secondary.text}
                                </Link>
                            </motion.div>

                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`w-3 h-3 rounded-full transition-colors duration-300 ${currentSlide === index ? 'bg-white' : 'bg-white/50'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>

                <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors duration-300"
                    aria-label="Previous slide"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors duration-300"
                    aria-label="Next slide"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </section>
    );
} 