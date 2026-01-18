'use client';

import { useEffect, ReactNode, useState } from 'react';

interface BaklavaProviderProps {
    children: ReactNode;
}

// Baklava is a web component library that needs to be initialized client-side
export function BaklavaProvider({ children }: BaklavaProviderProps) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const initBaklava = async () => {
            // Import Baklava to register all web components
            const baklava = await import('@trendyol/baklava');
            baklava.setIconPath('https://cdn.jsdelivr.net/npm/@trendyol/baklava-icons@latest/icons');

            // Also import the React wrappers which trigger component registration
            await import('@trendyol/baklava/dist/baklava-react');

            // Wait a bit for components to register
            await new Promise(resolve => setTimeout(resolve, 100));

            setIsReady(true);
        };

        initBaklava().catch(console.error);
    }, []);

    // Show children immediately, Baklava will hydrate when ready
    return <>{children}</>;
}
