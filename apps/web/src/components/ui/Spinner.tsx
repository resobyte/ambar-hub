'use client';

import { useState, useEffect } from 'react';

export type SpinnerSize = 'small' | 'medium' | 'large';
export type SpinnerVariant = 'primary' | 'secondary';

interface SpinnerProps {
    size?: SpinnerSize;
    overlay?: boolean;
}

export function Spinner({ size = 'medium', overlay = false }: SpinnerProps) {
    const [BlSpinner, setBlSpinner] = useState<any>(null);

    useEffect(() => {
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBlSpinner(() => mod.BlSpinner);
        }).catch(console.error);
    }, []);

    const sizeClasses = {
        small: 'w-4 h-4',
        medium: 'w-8 h-8',
        large: 'w-12 h-12',
    };

    const nativeSpinner = (
        <svg className={`animate-spin ${sizeClasses[size]} text-primary`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    );

    if (overlay) {
        return (
            <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
                {BlSpinner ? <BlSpinner size={size} /> : nativeSpinner}
            </div>
        );
    }

    return BlSpinner ? <BlSpinner size={size} /> : nativeSpinner;
}

Spinner.displayName = 'Spinner';
