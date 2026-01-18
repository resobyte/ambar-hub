'use client';

import { useState } from 'react';
import { Order, OrderStatus, createInvoiceFromOrder, getInvoicePdf, Integration } from '@/lib/api';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { ChevronRight, ChevronDown, FileStack } from 'lucide-react';

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
    const [bulkLoading, setBulkLoading] = useState(false);
    const [pdfHtml, setPdfHtml] = useState<string | null>(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === orders.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(orders.map(o => o.id)));
        }
    };

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

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

    const handleBulkInvoice = async () => {
        if (selectedIds.size === 0) {
            alert('Lütfen en az bir sipariş seçin');
            return;
        }

        setBulkLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/invoices/create-bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ orderIds: Array.from(selectedIds) }),
            });

            const data = await res.json();

            if (res.ok) {
                const successCount = data.success?.length || 0;
                const failedCount = data.failed?.length || 0;
                alert(`Toplu fatura tamamlandı!\nBaşarılı: ${successCount}\nBaşarısız: ${failedCount}`);
                setSelectedIds(new Set());
            } else {
                alert(`Hata: ${data.message || 'Toplu fatura oluşturulamadı'}`);
            }
        } catch (error: any) {
            alert(`Hata: ${error.message}`);
        } finally {
            setBulkLoading(false);
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
            < div className="flex-1" >
                {/* Single Fetch Toolbar */}
                < div className="bg-card border rounded-lg p-4 mb-4 flex items-center gap-4" >
                    <div className="flex-1 max-w-sm flex gap-2">
                        <Input
                            placeholder="Trendyol Sipariş No (örn: 927492934)"
                            className="h-9"
                            id="single-order-input"
                        />
                        <Button
                            className="whitespace-nowrap bg-orange-600 hover:bg-orange-700 text-white"
                            size="sm"
                            onClick={async () => {
                                const input = document.getElementById('single-order-input') as HTMLInputElement;
                                const val = input.value?.trim();
                                if (!val) {
                                    alert('Lütfen bir sipariş numarası girin');
                                    return;
                                }

                                try {
                                    const btn = document.activeElement as HTMLButtonElement;
                                    const originalText = btn.innerText;
                                    btn.innerText = 'Çekiliyor...';
                                    btn.disabled = true;

                                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/fetch-trendyol?orderNumber=${val}`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                    });
                                    const data = await res.json();

                                    if (data.success) {
                                        alert(`Başarılı: ${data.message}`);
                                        input.value = '';
                                        // Refresh list logic usually via parent but here we rely on manual reload or if we had a reload trigger
                                        // Ideally we call onFilterChange to trigger reload if we modify parent
                                        window.location.reload();
                                    } else {
                                        alert(`Hata: ${data.message}`);
                                    }

                                    btn.innerText = originalText;
                                    btn.disabled = false;
                                } catch (err: any) {
                                    alert('Bir hata oluştu: ' + err.message);
                                }
                            }}
                        >
                            Trendyol'dan Çek
                        </Button>
                    </div>
                </div >

                {
                    isLoading ? (
                        <div className="p-4 text-center" > Yükleniyor...</div>
                    ) : orders.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">Sipariş bulunamadı.</div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                {/* Bulk Actions Bar */}
                                {selectedIds.size > 0 && (
                                    <div className="bg-primary/10 p-3 flex items-center justify-between border-b">
                                        <span className="text-sm font-medium">
                                            {selectedIds.size} sipariş seçildi
                                        </span>
                                        <Button
                                            size="sm"
                                            onClick={handleBulkInvoice}
                                            disabled={bulkLoading}
                                        >
                                            <FileStack className="w-4 h-4 mr-2" />
                                            {bulkLoading ? 'İşleniyor...' : 'Toplu Fatura Kes'}
                                        </Button>
                                    </div>
                                )}
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                                        <tr>
                                            <th className="w-10 px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.size === orders.length && orders.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 rounded border-gray-300"
                                                />
                                            </th>
                                            <th className="w-10"></th>
                                            <th className="px-4 py-3 font-medium">Sipariş No</th>
                                            <th className="px-4 py-3 font-medium">Kaynak</th>
                                            <th className="px-4 py-3 font-medium">Müşteri</th>
                                            <th className="px-4 py-3 font-medium">Tarih</th>
                                            <th className="px-4 py-3 font-medium">Toplam</th>
                                            <th className="px-4 py-3 font-medium">Durum</th>
                                            <th className="px-4 py-3 font-medium">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {orders.map((order) => (
                                            <>
                                                <tr key={order.id} className="hover:bg-muted/20 transaction-colors">
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(order.id)}
                                                            onChange={() => toggleSelect(order.id)}
                                                            className="w-4 h-4 rounded border-gray-300"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => toggleExpand(order.id)}
                                                            className="p-1 hover:bg-muted rounded text-muted-foreground"
                                                        >
                                                            {expandedIds.has(order.id) ? (
                                                                <ChevronDown className="w-4 h-4" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    </td>
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
                                                        {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Misafir'}
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
                                                    <td className="px-4 py-3 space-x-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleCreateInvoice(order.id)}
                                                            disabled={invoiceLoading === order.id}
                                                        >
                                                            {invoiceLoading === order.id ? '...' : '📄 Fatura'}
                                                        </Button>
                                                        {order.cargoTrackingNumber && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={async () => {
                                                                    try {
                                                                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/${order.id}/label`, {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                        });
                                                                        if (res.ok) {
                                                                            alert('Aras Kargo barkodu başarıyla oluşturuldu.');
                                                                            // Optionally reload orders to show updated status if we displayed it
                                                                            // For now just alert is fine
                                                                        } else {
                                                                            const err = await res.json();
                                                                            alert(`Hata: ${err.message || 'Barkod alınamadı'}`);
                                                                        }
                                                                    } catch (e: any) {
                                                                        alert(`Hata: ${e.message}`);
                                                                    }
                                                                }}
                                                            >
                                                                📦 Aras
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                                {expandedIds.has(order.id) && (
                                                    <tr key={`${order.id}-detail`} className="bg-muted/10">
                                                        <td colSpan={9} className="p-4 pl-14">
                                                            <div className="rounded border bg-background overflow-hidden">
                                                                <div className="bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground uppercase">
                                                                    Sipariş İçeriği
                                                                </div>
                                                                {order.items && order.items.length > 0 ? (
                                                                    <table className="w-full text-sm">
                                                                        <thead className="text-muted-foreground text-xs uppercase bg-muted/30">
                                                                            <tr>
                                                                                <th className="px-4 py-2 font-medium text-left">Ürün Adı</th>
                                                                                <th className="px-4 py-2 font-medium text-left">SKU</th>
                                                                                <th className="px-4 py-2 font-medium text-center">Adet</th>
                                                                                <th className="px-4 py-2 font-medium text-right">Birim Fiyat</th>
                                                                                <th className="px-4 py-2 font-medium text-right">Toplam</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-border">
                                                                            {order.items.map((item) => (
                                                                                <tr key={item.id}>
                                                                                    <td className="px-4 py-2">{item.productName}</td>
                                                                                    <td className="px-4 py-2 font-mono text-xs">{item.sku || '-'}</td>
                                                                                    <td className="px-4 py-2 text-center">{item.quantity}</td>
                                                                                    <td className="px-4 py-2 text-right">
                                                                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.unitPrice)}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-right">
                                                                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.unitPrice * item.quantity)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                ) : (
                                                                    <div className="p-4 text-center text-muted-foreground">
                                                                        Ürün bilgisi yok
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between py-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground">Satır sayısı:</span>
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
                                    <span className="text-sm text-muted-foreground">Sayfa {currentPage} / {totalPages}</span>
                                    <div className="space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onPageChange(currentPage - 1)}
                                            disabled={currentPage <= 1}
                                        >
                                            Önceki
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onPageChange(currentPage + 1)}
                                            disabled={currentPage >= totalPages}
                                        >
                                            Sonraki
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )
                }
            </div >

            {/* PDF Modal */}
            {
                showPdfModal && pdfHtml && (
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
                )
            }
        </div >
    );
}
