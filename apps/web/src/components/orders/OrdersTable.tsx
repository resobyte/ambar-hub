'use client';

import { useState } from 'react';
import { Order, OrderStatus, createInvoiceFromOrder, getInvoicePdf, Integration } from '@/lib/api';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';

interface OrdersTableProps {
    orders: Order[];
    integrations: Integration[];
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    filters: {
        orderNumber?: string;
        packageId?: string;
        integrationId?: string;
        status?: string;
    };
    onFilterChange: (filters: any) => void;
}

export function OrdersTable({
    orders,
    integrations,
    isLoading,
    currentPage,
    totalPages,
    pageSize,
    onPageChange,
    onPageSizeChange,
    filters,
    onFilterChange,
}: OrdersTableProps) {
    const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);
    const [pdfHtml, setPdfHtml] = useState<string | null>(null);
    const [showPdfModal, setShowPdfModal] = useState(false);

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.DELIVERED: return 'success';
            case OrderStatus.SHIPPED: return 'info';
            case OrderStatus.CANCELLED:
            case OrderStatus.UNSUPPLIED: return 'error';
            case OrderStatus.CREATED:
            case OrderStatus.PICKING: return 'warning';
            default: return 'default';
        }
    };

    const handleCreateInvoice = async (orderId: string) => {
        setInvoiceLoading(orderId);
        try {
            const invoice = await createInvoiceFromOrder(orderId);
            if (invoice.status === 'SUCCESS') {
                // Get PDF after successful creation
                const pdf = await getInvoicePdf(invoice.id);
                setPdfHtml(pdf.html);
                setShowPdfModal(true);
            } else {
                alert(`Fatura oluşturuldu ama hata var: ${invoice.errorMessage}`);
            }
        } catch (error: any) {
            alert(`Fatura oluşturma hatası: ${error.message}`);
        } finally {
            setInvoiceLoading(null);
        }
    };

    return (
        <div className="flex gap-4 w-full">
            {/* Sidebar Filters */}
            <div className="w-64 shrink-0 space-y-4 p-4 border rounded-lg bg-card">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground">Filtreler</h3>

                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Sipariş No</label>
                    <Input
                        placeholder="Ara..."
                        value={filters.orderNumber || ''}
                        onChange={(e) => onFilterChange({ ...filters, orderNumber: e.target.value })}
                        className="h-8"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Package ID</label>
                    <Input
                        placeholder="Ara..."
                        value={filters.packageId || ''}
                        onChange={(e) => onFilterChange({ ...filters, packageId: e.target.value })}
                        className="h-8"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Entegrasyon</label>
                    <Select
                        className="h-8"
                        value={filters.integrationId || ''}
                        onChange={(e) => onFilterChange({ ...filters, integrationId: e.target.value })}
                        options={[
                            { value: '', label: 'Tümü' },
                            ...integrations.map(i => ({ value: i.id, label: i.name }))
                        ]}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Durum</label>
                    <Select
                        className="h-8"
                        value={filters.status || ''}
                        onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
                        options={[
                            { value: '', label: 'Tümü' },
                            ...Object.values(OrderStatus).map(s => ({ value: s, label: s }))
                        ]}
                    />
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onFilterChange({})}
                >
                    Filtreleri Temizle
                </Button>
            </div>

            {/* Main Table */}
            <div className="flex-1">
                {isLoading ? (
                    <div className="p-4 text-center">Loading...</div>
                ) : orders.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">No orders found.</div>
                ) : (
                    <>
                        <div className="rounded-md border">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Order Number</th>
                                        <th className="px-4 py-3 font-medium">Source</th>
                                        <th className="px-4 py-3 font-medium">Customer</th>
                                        <th className="px-4 py-3 font-medium">Date</th>
                                        <th className="px-4 py-3 font-medium">Total</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {orders.map((order) => (
                                        <tr key={order.id} className="hover:bg-muted/20 transaction-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{order.orderNumber}</div>
                                                {/* @ts-ignore */}
                                                <div className="text-xs text-muted-foreground">{order.packageId}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline">
                                                    {order.integration?.name || '-'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {new Date(order.orderDate).toLocaleDateString('tr-TR')}
                                            </td>
                                            <td className="px-4 py-3">
                                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.totalPrice)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCreateInvoice(order.id)}
                                                    disabled={invoiceLoading === order.id}
                                                >
                                                    {invoiceLoading === order.id ? '...' : '📄 Fatura'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between py-4">
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">Rows per page:</span>
                                <Select
                                    className="h-8 w-[70px]"
                                    value={String(pageSize)}
                                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                                    options={[
                                        { value: '20', label: '20' },
                                        { value: '50', label: '50' },
                                        { value: '100', label: '100' },
                                    ]}
                                />
                            </div>

                            <div className="flex items-center space-x-6">
                                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                                <div className="space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onPageChange(currentPage - 1)}
                                        disabled={currentPage <= 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onPageChange(currentPage + 1)}
                                        disabled={currentPage >= totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* PDF Modal */}
            {showPdfModal && pdfHtml && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background rounded-lg w-[90vw] h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Fatura Önizleme</h2>
                            <Button variant="outline" size="sm" onClick={() => setShowPdfModal(false)}>
                                Kapat
                            </Button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <iframe
                                srcDoc={pdfHtml}
                                className="w-full h-full border-0"
                                title="Fatura"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
