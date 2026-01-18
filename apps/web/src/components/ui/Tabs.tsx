'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Skeleton } from './Skeleton';

export interface TabItem {
    name: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    badge?: string;
    content: ReactNode;
}

interface TabsProps {
    tabs: TabItem[];
    defaultTab?: string;
    onChange?: (name: string) => void;
}

export function Tabs({ tabs, defaultTab, onChange }: TabsProps) {
    const [BaklavaComponents, setBaklavaComponents] = useState<any>(null);
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.name);

    useEffect(() => {
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setBaklavaComponents({ BlTabGroup: mod.BlTabGroup, BlTab: mod.BlTab, BlTabPanel: mod.BlTabPanel });
        }).catch(console.error);
    }, []);

    const handleTabChange = (name: string) => {
        setActiveTab(name);
        onChange?.(name);
    };

    if (!BaklavaComponents) {
        return (
            <div>
                <div className="flex border-b border-border space-x-4 mb-4">
                    {tabs.map((tab, i) => (
                        <Skeleton key={i} width={100} height={32} />
                    ))}
                </div>
                <div className="pt-4">
                    <Skeleton height={200} className="w-full rounded-lg" />
                </div>
            </div>
        );
    }

    const { BlTabGroup, BlTab, BlTabPanel } = BaklavaComponents;

    return (
        <BlTabGroup onChange={(e: any) => onChange?.(e.detail)}>
            {tabs.map((tab) => (
                <BlTab key={tab.name} name={tab.name} slot="tabs" disabled={tab.disabled} icon={tab.icon} badge={tab.badge}>
                    {tab.label}
                </BlTab>
            ))}
            {tabs.map((tab) => (
                <BlTabPanel key={tab.name} tab={tab.name}>
                    {tab.content}
                </BlTabPanel>
            ))}
        </BlTabGroup>
    );
}

Tabs.displayName = 'Tabs';
