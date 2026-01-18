'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from './Skeleton';

interface SwitchProps {
    checked?: boolean;
    disabled?: boolean;
    onChange?: (checked: boolean) => void;
    label?: string;
    skeleton?: boolean;
}

export function Switch({ checked = false, disabled = false, onChange, label, skeleton }: SwitchProps) {
    const [BlSwitch, setBlSwitch] = useState<any>(null);

    useEffect(() => {
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBlSwitch(() => mod.BlSwitch);
        }).catch(console.error);
    }, []);

    if (skeleton) {
        return <Skeleton width={40} height={24} className="rounded-full" />;
    }

    const handleToggle = () => {
        if (onChange && !disabled) {
            onChange(!checked);
        }
    };

    if (!BlSwitch) {
        return <Skeleton width={40} height={24} className="rounded-full" />;
    }

    return (
        <BlSwitch checked={checked} disabled={disabled} onBlToggle={handleToggle}>
            {label}
        </BlSwitch>
    );
}

Switch.displayName = 'Switch';
