'use client';

import Image from 'next/image';
import { Sheet, SheetTrigger, SheetContent } from '../ui/sheet';
import React from 'react';
import { cn } from '@/lib/utils';

export default function Header() {
    const [scrolled, setScrolled] = React.useState(false);

    React.useEffect(() => {
        const onScroll = () => {
            setScrolled(window.scrollY > 200);
        };
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={cn(
                `w-full flex items-center justify-between px-4 py-3 fixed top-0 left-0 z-50 transition-colors duration-300`,
                {
                    'border-b border-b-black/40 bg-black/40 backdrop-blur-md': scrolled,
                    'bg-transparent border-transparent': !scrolled,
                }
            )}
        >
            <div className="flex items-center">
                <Image
                    src="/images/logo.svg"
                    alt="Logo"
                    width={scrolled ? 40 : 60}
                    height={scrolled ? 40 : 60}
                    priority
                    className='transition-all duration-200 ease-in-out'
                />
            </div>
            <Sheet>
                <SheetTrigger asChild>
                    <button
                        aria-label="Open menu"
                        className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        {/* Hamburger icon */}
                        <svg
                            width="24"
                            height="24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-white"
                        >
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                    {/* Drawer content placeholder */}
                    <div className="p-6">
                        <p className="font-semibold text-lg">Menu</p>
                        <p className="text-muted-foreground mt-2">Add navigation here...</p>
                    </div>
                </SheetContent>
            </Sheet>
        </header>
    );
}
