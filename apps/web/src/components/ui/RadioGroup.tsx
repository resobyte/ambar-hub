'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from './Skeleton';

export interface RadioOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface RadioGroupProps {
    name: string;
    options: RadioOption[];
    value?: string;
    onChange?: (value: string) => void;
    disabled?: boolean;
    label?: string;
}

export function RadioGroup({ name, options, value, onChange, disabled = false, label }: RadioGroupProps) {
    const [BaklavaComponents, setBaklavaComponents] = useState<any>(null);

    useEffect(() => {
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBaklavaComponents({ BlRadioGroup: mod.BlRadioGroup, BlRadio: mod.BlRadio });
        }).catch(console.error);
    }, []);

    const handleChange = (e: any) => {
        if (onChange) {
            onChange(e.target?.value ?? e.detail?.value ?? e);
        }
    };

    if (!BaklavaComponents) {
        return (
            <div>
                {label && <Skeleton width={100} height={20} className="mb-2" />}
                <div className="space-y-2">
                    {options.map((_, i) => (
                        <div key={i} className="flex items-center space-x-2">
                            <Skeleton width={20} height={20} variant="circle" />
                            <Skeleton width={100} height={20} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const { BlRadioGroup, BlRadio } = BaklavaComponents;

    return (
        <div>
            {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}
            <BlRadioGroup name={name} value={value} onBlChange={handleChange}>
                {options.map((option) => (
                    <BlRadio key={option.value} value={option.value} disabled={disabled || option.disabled}>
                        {option.label}
                    </BlRadio>
                ))}
            </BlRadioGroup>
        </div>
    );
}

RadioGroup.displayName = 'RadioGroup';
