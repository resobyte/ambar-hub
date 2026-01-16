'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function DefinitionsTabs() {
    const pathname = usePathname();

    const tabs = [
        { name: 'Markalar', href: '/definitions/brands' },
        { name: 'Kategoriler', href: '/definitions/categories' },
        { name: 'Sarf Malzemeler', href: '/definitions/packing-materials' },
    ];

    return (
        <div className="border-b border-border mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => {
                    const isActive = pathname.startsWith(tab.href);
                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${isActive
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }
                            `}
                        >
                            {tab.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
