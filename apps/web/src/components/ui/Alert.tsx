'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Skeleton } from './Skeleton';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
    variant?: AlertVariant;
    icon?: boolean;
    closable?: boolean;
    caption?: string;
    description?: string;
    children?: ReactNode;
    onClose?: () => void;
}

const variantStyles: Record<string, string> = {
    info: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function Alert({
    variant = 'info',
    icon = true,
    closable = false,
    caption,
    description,
    children,
    onClose,
}: AlertProps) {
    const [BlAlert, setBlAlert] = useState<any>(null);

    useEffect(() => {
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBlAlert(() => mod.BlAlert);
        }).catch(console.error);
    }, []);

    if (!BlAlert) {
        return <Skeleton height={80} className="rounded-lg" />;
    }

    return (
        <BlAlert variant={variant} icon={icon} closable={closable} caption={caption} description={description} onBlClose={onClose}>
            {children}
        </BlAlert>
    );
}

Alert.displayName = 'Alert';
