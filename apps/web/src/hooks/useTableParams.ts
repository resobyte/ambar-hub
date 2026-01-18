'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export interface TableParams {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
    filters: Record<string, string>;
}

export interface UseTableParamsReturn {
    params: TableParams;
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;
    setSort: (sortBy: string, sortOrder?: 'ASC' | 'DESC') => void;
    setSearch: (search: string) => void;
    setFilter: (key: string, value: string) => void;
    setFilters: (filters: Record<string, string>) => void;
    clearFilters: () => void;
    getQueryString: () => string;
}

interface UseTableParamsOptions {
    defaultLimit?: number;
    defaultSortBy?: string;
    defaultSortOrder?: 'ASC' | 'DESC';
    filterKeys?: string[];
}

export function useTableParams(options: UseTableParamsOptions = {}): UseTableParamsReturn {
    const {
        defaultLimit = 20,
        defaultSortBy,
        defaultSortOrder = 'DESC',
        filterKeys = [],
    } = options;

    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Parse current params from URL
    const params = useMemo<TableParams>(() => {
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);
        const sortBy = searchParams.get('sortBy') || defaultSortBy;
        const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || defaultSortOrder;
        const search = searchParams.get('search') || undefined;

        // Parse filter params
        const filters: Record<string, string> = {};
        filterKeys.forEach((key) => {
            const value = searchParams.get(key);
            if (value) {
                filters[key] = value;
            }
        });

        // Also check for any other filter-like params
        searchParams.forEach((value, key) => {
            if (!['page', 'limit', 'sortBy', 'sortOrder', 'search'].includes(key)) {
                filters[key] = value;
            }
        });

        return { page, limit, sortBy, sortOrder, search, filters };
    }, [searchParams, defaultLimit, defaultSortBy, defaultSortOrder, filterKeys]);

    // Update URL with new params
    const updateURL = useCallback(
        (updates: Partial<TableParams>) => {
            const newParams = new URLSearchParams();
            const merged = { ...params, ...updates };

            // Page
            if (merged.page && merged.page > 1) {
                newParams.set('page', String(merged.page));
            }

            // Limit
            if (merged.limit && merged.limit !== defaultLimit) {
                newParams.set('limit', String(merged.limit));
            }

            // Sort
            if (merged.sortBy) {
                newParams.set('sortBy', merged.sortBy);
                if (merged.sortOrder) {
                    newParams.set('sortOrder', merged.sortOrder);
                }
            }

            // Search
            if (merged.search) {
                newParams.set('search', merged.search);
            }

            // Filters
            const mergedFilters = { ...params.filters, ...(updates.filters || {}) };
            Object.entries(mergedFilters).forEach(([key, value]) => {
                if (value) {
                    newParams.set(key, value);
                }
            });

            const queryString = newParams.toString();
            router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
        },
        [params, pathname, router, defaultLimit]
    );

    const setPage = useCallback((page: number) => {
        updateURL({ page });
    }, [updateURL]);

    const setLimit = useCallback((limit: number) => {
        updateURL({ page: 1, limit });
    }, [updateURL]);

    const setSort = useCallback((sortBy: string, sortOrder?: 'ASC' | 'DESC') => {
        // Toggle sort order if clicking same column
        const newSortOrder = params.sortBy === sortBy && params.sortOrder === 'ASC' ? 'DESC' : 'ASC';
        updateURL({ sortBy, sortOrder: sortOrder || newSortOrder, page: 1 });
    }, [updateURL, params.sortBy, params.sortOrder]);

    const setSearch = useCallback((search: string) => {
        updateURL({ search: search || undefined, page: 1 });
    }, [updateURL]);

    const setFilter = useCallback((key: string, value: string) => {
        updateURL({
            filters: { ...params.filters, [key]: value || '' },
            page: 1
        });
    }, [updateURL, params.filters]);

    const setFilters = useCallback((filters: Record<string, string>) => {
        updateURL({ filters, page: 1 });
    }, [updateURL]);

    const clearFilters = useCallback(() => {
        updateURL({ filters: {}, search: undefined, page: 1 });
    }, [updateURL]);

    const getQueryString = useCallback(() => {
        const newParams = new URLSearchParams();

        if (params.page > 1) newParams.set('page', String(params.page));
        if (params.limit !== defaultLimit) newParams.set('limit', String(params.limit));
        if (params.sortBy) {
            newParams.set('sortBy', params.sortBy);
            if (params.sortOrder) newParams.set('sortOrder', params.sortOrder);
        }
        if (params.search) newParams.set('search', params.search);

        Object.entries(params.filters).forEach(([key, value]) => {
            if (value) newParams.set(key, value);
        });

        return newParams.toString();
    }, [params, defaultLimit]);

    return {
        params,
        setPage,
        setLimit,
        setSort,
        setSearch,
        setFilter,
        setFilters,
        clearFilters,
        getQueryString,
    };
}
