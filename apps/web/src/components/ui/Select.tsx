'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Skeleton } from './Skeleton';

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export type SelectSize = 'small' | 'medium' | 'large';

interface SelectProps {
    options: SelectOption[];
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    placeholder?: string;
    label?: string;
    helpText?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    size?: SelectSize;
    searchable?: boolean;
    clearable?: boolean;
    loading?: boolean;
    onSearch?: (query: string) => void | Promise<void>;
    className?: string;
    skeleton?: boolean;
}

export function Select({
    options,
    value,
    onChange,
    placeholder = 'Seçiniz...',
    label,
    helpText,
    error,
    disabled = false,
    required = false,
    size = 'medium',
    searchable = false,
    clearable = false,
    loading = false,
    onSearch,
    className,
    skeleton,
}: SelectProps) {
    const [BaklavaComponents, setBaklavaComponents] = useState<any>(null);

    useEffect(() => {
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBaklavaComponents({ BlSelect: mod.BlSelect, BlSelectOption: mod.BlSelectOption });
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

    const handleChange = (e: any) => {
        if (onChange) {
            const selectedValue = e?.target?.value ?? e?.detail?.value ?? e?.detail ?? e;
            onChange({ target: { value: String(selectedValue) }, currentTarget: { value: String(selectedValue) } } as any);
        }
    };

    const handleSearch = (e: any) => {
        if (onSearch) {
            const query = e.detail?.searchText || '';
            onSearch(query);
        }
    };

    // Fallback to Skeleton until Baklava loads
    if (!BaklavaComponents) {
        return (
            <div className={`space-y-1 ${className || ''}`}>
                {label && <Skeleton width={100} height={20} className="mb-1" />}
                <Skeleton height={size === 'large' ? 48 : size === 'small' ? 32 : 40} className="rounded-lg" />
            </div>
        );
    }

    const { BlSelect, BlSelectOption } = BaklavaComponents;

    return (
        <BlSelect
            value={value}
            placeholder={placeholder}
            label={label}
            helpText={error || helpText}
            invalid={!!error}
            disabled={disabled}
            required={required}
            size={size}
            search-bar={searchable}
            clearable={clearable}
            loading={loading}
            onBlSelect={handleChange}
            onBlSearch={searchable ? handleSearch : undefined}
            className={className}
        >
            {options.map((option) => (
                <BlSelectOption key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                </BlSelectOption>
            ))}
        </BlSelect>
    );
}

Select.displayName = 'Select';
