'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { SyncOrdersDialog } from '@/components/orders/SyncOrdersDialog';
import { getIntegrations, Order, Integration } from '@/lib/api';
import { RefreshCw, Download } from 'lucide-react';

export function OrdersClient() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<{
        orderNumber?: string;
        packageId?: string;
        integrationId?: string;
        status?: string;
    }>({});

    // Fetch integrations once
    useEffect(() => {
        getIntegrations(1, 100).then(res => setIntegrations(res.data)).catch(console.error);
    }, []);

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            // Build query params with filters
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('limit', String(pageSize));
            if (filters.orderNumber) params.append('orderNumber', filters.orderNumber);
            if (filters.packageId) params.append('packageId', filters.packageId);
            if (filters.integrationId) params.append('integrationId', filters.integrationId);
            if (filters.status) params.append('status', filters.status);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders?${params}`, {
                credentials: 'include',
            });
            const data = await res.json();
            setOrders(data.data || []);
            if (data.meta) {
                setTotalPages(data.meta.totalPages);
            }
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, filters]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(1);
    };

    const handleFilterChange = (newFilters: any) => {
        setFilters(newFilters);
        setPage(1); // Reset to first page on filter change
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Siparişler</h1>
                    <p className="text-muted-foreground mt-1">
                        Pazaryerlerinden gelen siparişleri görüntüleyin ve yönetin.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={fetchOrders} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Yenile
                    </Button>
                    <Button onClick={() => setIsSyncDialogOpen(true)}>
                        <Download className="w-4 h-4 mr-2" />
                        Sipariş Eşitle
                    </Button>
                </div>
            </div>

            <div className="border border-border rounded-xl bg-card p-4">
                <OrdersTable
                    orders={orders}
                    integrations={integrations}
                    isLoading={isLoading}
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={handlePageSizeChange}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                />
            </div>

            <SyncOrdersDialog
                open={isSyncDialogOpen}
                onClose={() => setIsSyncDialogOpen(false)}
                onSuccess={() => {
                    setTimeout(fetchOrders, 1000);
                }}
            />
        </div>
    );
}
