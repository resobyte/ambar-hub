'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Skeleton } from './Skeleton';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary' | 'secondary' | 'destructive';
export type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
    variant?: BadgeVariant;
    size?: BadgeSize;
    icon?: string;
    children: ReactNode;
}

const variantMap: Record<string, string> = {
    success: 'success',
    danger: 'danger',
    warning: 'warning',
    info: 'info',
    neutral: 'neutral',
    primary: 'info',
    secondary: 'neutral',
    destructive: 'danger',
};

const variantStyles: Record<string, string> = {
    success: 'bg-success/10 text-success border-success/20',
    danger: 'bg-destructive/10 text-destructive border-destructive/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    neutral: 'bg-muted text-muted-foreground border-border',
};

export function Badge({ variant = 'neutral', size = 'medium', icon, children }: BadgeProps) {
    const [BlBadge, setBlBadge] = useState<any>(null);

    useEffect(() => {
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBlBadge(() => mod.BlBadge);
        }).catch(console.error);
    }, []);

    const mappedVariant = variantMap[variant] || 'neutral';

    if (!BlBadge) {
        return <Skeleton width={60} height={20} className="rounded-full" />;
    }

    return (
        <BlBadge variant={mappedVariant as any} size={size} icon={icon}>
            {children}
        </BlBadge>
    );
}

Badge.displayName = 'Badge';
