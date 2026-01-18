'use client';

import { ReactNode, useState, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';

// Types
export interface DataTableColumn<T> {
    key: string;
    header: string;
    sortable?: boolean;
    align?: 'left' | 'center' | 'right';
    width?: string;
    shrink?: boolean;
    render?: (row: T) => ReactNode;
}

export interface DataTablePagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface DataTableSortConfig {
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
}

export interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    data: T[];
    keyExtractor: (item: T) => string;
    isLoading?: boolean;
    pagination?: DataTablePagination;
    sortConfig?: DataTableSortConfig;
    onPageChange?: (page: number) => void;
    onLimitChange?: (limit: number) => void;
    onSort?: (column: string) => void;
    emptyMessage?: string;
    selectable?: boolean;
    selectedKeys?: string[];
    onSelectionChange?: (keys: string[]) => void;
}

// Loading Component
// Loading Component
import ContentLoader from 'react-content-loader';

const TableLoading = () => (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm p-4">
        <ContentLoader
            speed={2}
            width="100%"
            height={400}
            backgroundColor="var(--bl-color-neutral-lighter, #f3f3f3)"
            foregroundColor="var(--bl-color-neutral-light, #ecebeb)"
            backgroundOpacity={0.5}
        >
            {/* Header */}
            <rect x="0" y="0" rx="4" ry="4" width="100%" height="48" />

            {/* Rows with spacing */}
            <rect x="0" y="64" rx="4" ry="4" width="100%" height="64" />
            <rect x="0" y="144" rx="4" ry="4" width="100%" height="64" />
            <rect x="0" y="224" rx="4" ry="4" width="100%" height="64" />
            <rect x="0" y="304" rx="4" ry="4" width="100%" height="64" />
        </ContentLoader>
    </div>
);

// Inner component that will be dynamically imported
const DataTableInner = <T,>({
    columns,
    data,
    keyExtractor,
    isLoading = false,
    pagination,
    sortConfig,
    onPageChange,
    onLimitChange,
    onSort,
    emptyMessage = 'Veri bulunamadı',
    selectable = false,
    selectedKeys = [],
    onSelectionChange,
}: DataTableProps<T>) => {
    // Use state to store the imported components
    const [Components, setComponents] = useState<any>(null);

    useEffect(() => {
        // Import Baklava React components
        import('@trendyol/baklava/dist/baklava-react').then((mod) => {
            setComponents({
                BlTable: mod.BlTable,
                BlTableHeader: mod.BlTableHeader,
                BlTableBody: mod.BlTableBody,
                BlTableRow: mod.BlTableRow,
                BlTableCell: mod.BlTableCell,
                BlTableHeaderCell: mod.BlTableHeaderCell,
                BlPagination: mod.BlPagination,
            });
        });
    }, []);

    if (!Components) {
        return <TableLoading />;
    }

    const {
        BlTable,
        BlTableHeader,
        BlTableBody,
        BlTableRow,
        BlTableCell,
        BlTableHeaderCell,
        BlPagination,
    } = Components;

    const handleSort = (e: any) => {
        if (onSort && e.detail) {
            const [sortKey] = e.detail;
            if (sortKey) onSort(sortKey);
        }
    };

    const handleRowSelect = (e: any) => {
        if (onSelectionChange && e.detail) {
            onSelectionChange(e.detail);
        }
    };

    const handlePageChange = (e: any) => {
        if (onPageChange && e.detail) {
            const page = e.detail.currentPage;
            if (typeof page === 'number') onPageChange(page);
        }
    };

    if (isLoading) {
        return <TableLoading />;
    }

    if (!data?.length) {
        return (
            <div className="bg-card rounded-xl border border-border shadow-sm">
                <div className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                        <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <p className="text-muted-foreground text-lg">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card overflow-hidden">
            <BlTable
                sortable={columns.some(c => c.sortable)}
                selectable={selectable}
                multiple={selectable}
                selected={selectedKeys}
                sort-key={sortConfig?.sortBy || ''}
                sort-direction={sortConfig?.sortOrder?.toLowerCase() || ''}
                onBlSort={handleSort}
                onBlRowSelect={handleRowSelect}
            >
                <BlTableHeader>
                    <BlTableRow>
                        {columns.map((col) => (
                            <BlTableHeaderCell
                                key={col.key}
                                sort-key={col.sortable ? col.key : undefined}
                                style={{
                                    '--bl-table-header-cell-width': col.width,
                                    '--bl-table-header-cell-min-width': col.width,
                                    textAlign: col.align || 'left'
                                } as any}
                            >
                                {col.header}
                            </BlTableHeaderCell>
                        ))}
                    </BlTableRow>
                </BlTableHeader>
                <BlTableBody>
                    {data.map((row) => (
                        <BlTableRow key={keyExtractor(row)} selection-key={keyExtractor(row)}>
                            {columns.map((col) => (
                                <BlTableCell key={col.key} style={{ textAlign: col.align || 'left' }}>
                                    {col.render ? col.render(row) : (row as any)[col.key]}
                                </BlTableCell>
                            ))}
                        </BlTableRow>
                    ))}
                </BlTableBody>
            </BlTable>

            {pagination && (
                <div className="p-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Toplam <span className="font-medium text-foreground">{pagination.total}</span> kayıt
                    </div>
                    <BlPagination
                        current-page={pagination.page}
                        total-items={pagination.total}
                        items-per-page={pagination.limit}
                        has-jumper={pagination.totalPages > 10 ? true : false}
                        jumper-label="Sayfaya Git"
                        has-select={pagination.totalPages > 10 ? true : false}
                        select-label="Sayfa Başına"
                        items-per-page-options={[10, 20, 50, 100]}
                        onBlChange={handlePageChange}
                    />
                </div>
            )}
        </div>
    );
};

// Main export - Client only wrapper using dynamic import with ssr: false
const DataTableClient = dynamic(
    () => Promise.resolve(DataTableInner),
    {
        ssr: false,
        loading: () => <TableLoading />
    }
);

// We need to cast it to handle the generic type properly
export const DataTable = DataTableClient as typeof DataTableInner;
