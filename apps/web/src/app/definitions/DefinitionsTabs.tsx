'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function DefinitionsTabs() {
    const pathname = usePathname();
    const router = useRouter();

    const tabs = [
        { name: 'Markalar', href: '/definitions/brands' },
        { name: 'Kategoriler', href: '/definitions/categories' },
        { name: 'Sarf Malzemeler', href: '/definitions/packing-materials' },
    ];

    const currentTab = tabs.find(tab => pathname.startsWith(tab.href));
    const currentTabValue = currentTab?.href || tabs[0].href;
    const currentTabName = currentTab?.name || 'Markalar';

    return (
        <div className="space-y-6 mb-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/definitions">Tanımlamalar</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{currentTabName}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <Tabs
                value={currentTabValue}
                onValueChange={(value) => router.push(value)}
                className="w-full"
            >
                <TabsList className="bg-muted p-1 rounded-lg h-auto inline-flex">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.name}
                            value={tab.href}
                            className="px-4 py-2 rounded-md transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                        >
                            {tab.name}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
        </div>
    );
}
