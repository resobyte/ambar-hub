'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Skeleton } from './Skeleton';

export type InputSize = 'small' | 'medium' | 'large';
export type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time' | 'month' | 'week';

interface InputProps {
    label?: string;
    helpText?: string;
    error?: string;
    icon?: string | ReactNode;
    size?: InputSize;
    type?: InputType;
    placeholder?: string;
    value?: string | number;
    onChange?: (e: any) => void;
    onInput?: (e: any) => void;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    id?: string;
    className?: string;
    min?: string | number;
    max?: string | number;
    step?: string | number;
    pattern?: string;
    autoComplete?: string;
    autoFocus?: boolean;
    skeleton?: boolean;
}

export function Input({
    label,
    helpText,
    error,
    icon,
    size = 'medium',
    type = 'text',
    placeholder,
    value,
    onChange,
    onInput,
    disabled,
    required,
    name,
    id,
    className,
    min,
    max,
    step,
    pattern,
    autoComplete,
    autoFocus,
    skeleton,
}: InputProps) {
    const [BlInput, setBlInput] = useState<any>(null);

    useEffect(() => {
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBlInput(() => mod.BlInput);
        }).catch(console.error);
    }, []);

    if (skeleton) {
        return (
            <div className={`space-y-1 ${className || ''}`}>
                {label && <Skeleton width={100} height={20} className="mb-1" />}
                <Skeleton height={size === 'large' ? 48 : size === 'small' ? 32 : 40} className="rounded-lg" />
            </div>
        );
    }

    const handleInput = (e: any) => {
        const inputValue = e.target?.value ?? e.detail?.value ?? e.detail ?? '';
        const syntheticEvent = {
            target: { value: inputValue, name },
            currentTarget: { value: inputValue, name },
            ...e,
        };

        if (onInput) onInput(syntheticEvent);
        if (onChange) onChange(syntheticEvent);
    };

    const iconName = typeof icon === 'string' ? icon : undefined;

    // Fallback to Skeleton until Baklava loads
    if (!BlInput) {
        return (
            <div className={`space-y-1 ${className || ''}`}>
                {label && <Skeleton width={100} height={20} className="mb-1" />}
                <Skeleton height={size === 'large' ? 48 : size === 'small' ? 32 : 40} className="rounded-lg" />
            </div>
        );
    }

    return (
        <BlInput
            label={label}
            helpText={error || helpText}
            invalid={!!error}
            icon={iconName}
            size={size}
            type={type}
            placeholder={placeholder}
            value={value as string}
            onBlInput={handleInput}
            disabled={disabled}
            required={required}
            name={name}
            className={className}
            pattern={pattern}
            autocomplete={autoComplete}
            autofocus={autoFocus}
        />
    );
}

Input.displayName = 'Input';
