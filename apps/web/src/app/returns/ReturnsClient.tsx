'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useToast } from '@/components/ui/use-toast';
import { useTableQuery } from '@/hooks/use-table-query';
import { ReturnsTable } from '@/components/returns/ReturnsTable';

import { getReturns, getStores, syncReturns, Store } from '@/lib/api';

export function ReturnsClient() {
    const router = useRouter();
    const { toast } = useToast();
    const [returns, setReturns] = useState<any[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const { page, pageSize, filters, setPage, setPageSize, setFilters } = useTableQuery({
        defaultPage: 1,
        defaultPageSize: 20,
    });

    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchReturns = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getReturns(page, pageSize, {
                status: filters.status || undefined,
                storeId: filters.storeId || undefined,
                search: filters.search || undefined,
            });
            setReturns(res.data || []);
            setTotalPages(res.meta?.totalPages || 1);
            setTotal(res.meta?.total || 0);
        } catch (error) {
            console.error('Failed to fetch returns:', error);
            toast({
                title: 'Hata',
                description: 'İadeler yüklenemedi',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, filters, toast]);

    const fetchStores = async () => {
        try {
            const res = await getStores(1, 100, 'TRENDYOL');
            setStores(res.data || []);
        } catch (error) {
            console.error('Failed to fetch stores:', error);
        }
    };

    useEffect(() => {
        fetchStores();
    }, []);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const handleSync = async (storeId: string) => {
        setSyncing(true);
        try {
            const res = await syncReturns(storeId);
            toast({
                title: 'Başarılı',
                description: res.message || 'İadeler senkronize edildi',
            });
            fetchReturns();
        } catch (error: any) {
            toast({
                title: 'Hata',
                description: error.message || 'Senkronizasyon başarısız',
                variant: 'destructive',
            });
        } finally {
            setSyncing(false);
        }
    };

    const handleFilterChange = (newFilters: any) => {
        setFilters(newFilters);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>İadeler</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex items-center gap-2">
                    {stores.map(store => (
                        <Button
                            key={store.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(store.id)}
                            disabled={syncing}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            {store.name} Senkronize Et
                        </Button>
                    ))}
                </div>
            </div>

            <div className="border border-border rounded-xl bg-card p-4">
                <ReturnsTable
                    returns={returns}
                    stores={stores}
                    isLoading={loading}
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                />
            </div>
        </div>
    );
}
