'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

interface UseTableQueryOptions {
    defaultPage?: number;
    defaultPageSize?: number;
}

interface TableQueryState {
    page: number;
    pageSize: number;
    filters: Record<string, string>;
}

interface UseTableQueryReturn extends TableQueryState {
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    setFilter: (key: string, value: string) => void;
    setFilters: (filters: Record<string, string>) => void;
    clearFilters: () => void;
}

export function useTableQuery(options: UseTableQueryOptions = {}): UseTableQueryReturn {
    const { defaultPage = 1, defaultPageSize = 10 } = options;

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Parse current state from URL
    const page = useMemo(() => {
        const p = searchParams.get('page');
        return p ? parseInt(p, 10) : defaultPage;
    }, [searchParams, defaultPage]);

    const pageSize = useMemo(() => {
        const ps = searchParams.get('pageSize');
        return ps ? parseInt(ps, 10) : defaultPageSize;
    }, [searchParams, defaultPageSize]);

    const filters = useMemo(() => {
        const result: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            if (key !== 'page' && key !== 'pageSize') {
                result[key] = value;
            }
        });
        return result;
    }, [searchParams]);

    // Helper to update URL
    const updateUrl = useCallback((updates: Record<string, string | null>) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === '' || value === undefined) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        });

        const queryString = params.toString();
        router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
    }, [router, pathname, searchParams]);

    const setPage = useCallback((newPage: number) => {
        updateUrl({ page: String(newPage) });
    }, [updateUrl]);

    const setPageSize = useCallback((newPageSize: number) => {
        // Reset to page 1 when changing page size
        updateUrl({ page: '1', pageSize: String(newPageSize) });
    }, [updateUrl]);

    const setFilter = useCallback((key: string, value: string) => {
        // Reset to page 1 when changing filters
        updateUrl({ [key]: value || null, page: '1' });
    }, [updateUrl]);

    const setFilters = useCallback((newFilters: Record<string, string>) => {
        const updates: Record<string, string | null> = { page: '1' };

        // Clear existing filters
        Object.keys(filters).forEach(key => {
            updates[key] = null;
        });

        // Set new filters
        Object.entries(newFilters).forEach(([key, value]) => {
            updates[key] = value || null;
        });

        updateUrl(updates);
    }, [updateUrl, filters]);

    const clearFilters = useCallback(() => {
        const updates: Record<string, string | null> = { page: '1' };
        Object.keys(filters).forEach(key => {
            updates[key] = null;
        });
        updateUrl(updates);
    }, [updateUrl, filters]);

    return {
        page,
        pageSize,
        filters,
        setPage,
        setPageSize,
        setFilter,
        setFilters,
        clearFilters,
    };
}
