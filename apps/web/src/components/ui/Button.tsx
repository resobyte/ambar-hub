'use client';

import { ReactNode, MouseEventHandler, useState, useEffect } from 'react';
import { Skeleton } from './Skeleton';

// Extended variants with backward compatibility aliases
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'destructive' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg';
export type ButtonKind = 'default' | 'outline' | 'text';

interface ButtonProps {
    variant?: ButtonVariant;
    size?: ButtonSize;
    kind?: ButtonKind;
    icon?: string;
    label?: string;
    loading?: boolean;
    isLoading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onClick?: MouseEventHandler<HTMLButtonElement>;
    children?: ReactNode;
    className?: string;
    title?: string;
    skeleton?: boolean;
}

// Map old variants to Baklava variants
const variantMap: Record<string, string> = {
    primary: 'primary',
    secondary: 'secondary',
    tertiary: 'tertiary',
    danger: 'danger',
    destructive: 'danger',
    outline: 'secondary',
    ghost: 'tertiary',
};

// Map old sizes to Baklava sizes
const sizeMap: Record<string, string> = {
    small: 'small',
    medium: 'medium',
    large: 'large',
    sm: 'small',
    md: 'medium',
    lg: 'large',
};

// Style mapping for native button
const variantStyles: Record<string, string> = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    tertiary: 'bg-transparent text-foreground hover:bg-muted',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

const sizeStyles: Record<string, string> = {
    small: 'h-8 px-3 text-sm',
    medium: 'h-10 px-4 text-sm',
    large: 'h-12 px-6 text-base',
};

export function Button({
    variant = 'primary',
    size = 'medium',
    kind = 'default',
    icon,
    label,
    loading = false,
    isLoading = false,
    disabled,
    children,
    onClick,
    type = 'button',
    className = '',
    title,
    skeleton,
}: ButtonProps) {
    const [BlButton, setBlButton] = useState<any>(null);

    useEffect(() => {
        // Dynamically import Baklava only on client side
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBlButton(() => mod.BlButton);
        }).catch(console.error);
    }, []);

    const isButtonLoading = loading || isLoading;
    const mappedVariant = variantMap[variant] || 'primary';
    const mappedSize = sizeMap[size] || 'medium';

    if (skeleton) {
        const heightStr = sizeStyles[mappedSize]?.split(' ')[0] || 'h-10';
        const height = heightStr === 'h-12' ? 48 : heightStr === 'h-8' ? 32 : 40;
        return <Skeleton className={`rounded-lg ${className}`} height={height} width={label ? undefined : height} />;
    }

    let effectiveKind = kind;
    if (variant === 'outline') effectiveKind = 'outline';
    if (variant === 'ghost') effectiveKind = 'text';

    const handleClick = (e: any) => {
        if (onClick && !disabled && !isButtonLoading) {
            onClick(e);
        }
    };

    // Use Skeleton until Baklava loads
    if (!BlButton) {
        const mappedSize = sizeMap[size] || 'medium';
        const heightStr = sizeStyles[mappedSize]?.split(' ')[0] || 'h-10';
        const height = heightStr === 'h-12' ? 48 : heightStr === 'h-8' ? 32 : 40;
        return <Skeleton className={`rounded-lg ${className}`} height={height} width={label ? undefined : height} />;
    }

    return (
        <BlButton
            variant={mappedVariant as any}
            size={mappedSize as any}
            kind={effectiveKind as any}
            icon={icon}
            label={label || undefined}
            loading={isButtonLoading}
            disabled={disabled || isButtonLoading}
            onBlClick={handleClick}
            type={type === 'submit' ? 'submit' : undefined}
            className={className}
            title={title}
        >
            {children}
        </BlButton>
    );
}

Button.displayName = 'Button';
