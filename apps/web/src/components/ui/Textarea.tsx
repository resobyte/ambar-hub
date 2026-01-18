'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from './Skeleton';

export type TextareaSize = 'small' | 'medium' | 'large';

interface TextareaProps {
    label?: string;
    helpText?: string;
    error?: string;
    size?: TextareaSize;
    maxLength?: number;
    rows?: number;
    placeholder?: string;
    value?: string;
    onChange?: (e: any) => void;
    onInput?: (e: any) => void;
    disabled?: boolean;
    required?: boolean;
    name?: string;
    className?: string;
    skeleton?: boolean;
}

export function Textarea({
    label,
    helpText,
    error,
    size = 'medium',
    maxLength,
    rows = 3,
    placeholder,
    value,
    onChange,
    onInput,
    disabled,
    required,
    name,
    className,
    skeleton,
}: TextareaProps) {
    const [BlTextarea, setBlTextarea] = useState<any>(null);

    useEffect(() => {
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBlTextarea(() => mod.BlTextarea);
        }).catch(console.error);
    }, []);

    if (skeleton) {
        return (
            <div className={`space-y-1 ${className || ''}`}>
                {label && <Skeleton width={100} height={20} className="mb-1" />}
                <Skeleton height={rows * 20 + 20} className="rounded-lg" />
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

    if (!BlTextarea) {
        return (
            <div className={`space-y-1 ${className || ''}`}>
                {label && <Skeleton width={100} height={20} className="mb-1" />}
                <Skeleton height={rows * 20 + 20} className="rounded-lg" />
            </div>
        );
    }

    return (
        <BlTextarea
            label={label}
            helpText={error || helpText}
            invalid={!!error}
            size={size}
            maxlength={maxLength}
            rows={rows}
            placeholder={placeholder}
            value={value as string}
            onBlInput={handleInput}
            disabled={disabled}
            required={required}
            name={name}
            className={className}
        />
    );
}

Textarea.displayName = 'Textarea';
