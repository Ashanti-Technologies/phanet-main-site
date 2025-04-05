import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center bg-antiflash-white">
            <div className="text-center px-4">
                <h1 className="text-6xl font-bold text-midnight-green mb-4">404</h1>
                <h2 className="text-3xl font-semibold text-midnight-green mb-6">Coming Soon</h2>
                <p className="text-gray-600 mb-8">This page is under construction.</p>
                <Link
                    href="/"
                    className="inline-flex items-center text-white bg-crayola hover:bg-crayola/90 px-6 py-3 rounded-lg transition-all duration-300 hover:scale-105"
                >
                    <span>Return Home</span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 ml-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                    >
                        <path
                            fillRule="evenodd"
                            d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                </Link>
            </div>
        </div>
    );
} 