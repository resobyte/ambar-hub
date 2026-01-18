'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { SyncOrdersDialog } from '@/components/orders/SyncOrdersDialog';
import { getIntegrations, getStores, Order, Integration, Store } from '@/lib/api';
import { RefreshCw, Download, Plus, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FetchOrderDialog } from '@/components/orders/FetchOrderDialog';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function OrdersClient() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
    const [isFetchDialogOpen, setIsFetchDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [filters, setFilters] = useState<{
        orderNumber?: string;
        packageId?: string;
        integrationId?: string;
        storeId?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        customerName?: string;
        micro?: boolean;
        startDeliveryDate?: string;
        endDeliveryDate?: string;
    }>({});

    // Fetch integrations and stores once
    useEffect(() => {
        getIntegrations(1, 100).then(res => setIntegrations(res.data)).catch(console.error);
        getStores(1, 100).then(res => setStores(res.data)).catch(console.error);
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
            if (filters.storeId) params.append('storeId', filters.storeId);
            if (filters.status) params.append('status', filters.status);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.customerName) params.append('customerName', filters.customerName);
            if (filters.micro !== undefined) params.append('micro', String(filters.micro));
            if (filters.startDeliveryDate) params.append('startDeliveryDate', filters.startDeliveryDate);
            if (filters.endDeliveryDate) params.append('endDeliveryDate', filters.endDeliveryDate);

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

    const handleExportExcel = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.orderNumber) params.append('orderNumber', filters.orderNumber);
            if (filters.packageId) params.append('packageId', filters.packageId);
            if (filters.integrationId) params.append('integrationId', filters.integrationId);
            if (filters.storeId) params.append('storeId', filters.storeId);
            if (filters.status) params.append('status', filters.status);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.customerName) params.append('customerName', filters.customerName);
            if (filters.micro !== undefined) params.append('micro', String(filters.micro));
            if (filters.startDeliveryDate) params.append('startDeliveryDate', filters.startDeliveryDate);
            if (filters.endDeliveryDate) params.append('endDeliveryDate', filters.endDeliveryDate);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/export?${params}`, {
                credentials: 'include',
            });

            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `siparisler-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export failed', error);
        }
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
                            <BreadcrumbPage>Siparişler</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={() => { }} // Placeholder for Create Order
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Sipariş Oluştur
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFetchDialogOpen(true)}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Sipariş Çek
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={fetchOrders} disabled={isLoading}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Yenile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setIsSyncDialogOpen(true)}>
                                <Download className="w-4 h-4 mr-2" />
                                Sipariş Eşitle
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>


            <div className="border border-border rounded-xl bg-card p-4">
                <OrdersTable
                    orders={orders}
                    integrations={integrations}
                    stores={stores}
                    isLoading={isLoading}
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={handlePageSizeChange}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onExport={handleExportExcel}
                />
            </div>

            <SyncOrdersDialog
                open={isSyncDialogOpen}
                onClose={() => setIsSyncDialogOpen(false)}
                onSuccess={() => {
                    setTimeout(fetchOrders, 1000);
                }}
            />

            <FetchOrderDialog
                open={isFetchDialogOpen}
                onClose={() => setIsFetchDialogOpen(false)}
                onSuccess={() => {
                    setTimeout(fetchOrders, 1000);
                }}
            />
        </div>
    );
}
