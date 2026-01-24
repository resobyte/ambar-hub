'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order, OrderStatus, createInvoiceFromOrder, getInvoicePdf, Store } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import {
    ChevronRight,
    ChevronDown,
    FileStack,
    Filter,
    FileSpreadsheet,
    Download,
    RefreshCw,
    Loader2,
    Package,
    Truck,
    Eye,
    ChevronLeft,
    X,
    FileText,
    Send,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { DataTablePagination } from '@/components/ui/data-table-pagination';

interface OrdersTableProps {
    orders: Order[];
    stores: Store[];
    isLoading: boolean;
    currentPage: number;
    totalPages: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
    filters: {
        orderNumber?: string;
        packageId?: string;
        storeId?: string;
        status?: string;
        [key: string]: any;
    };
    onFilterChange: (filters: any) => void;
    onExport: () => void;
}

export function OrdersTable({
    orders,
    stores,
    isLoading,
    currentPage,
    totalPages,
    pageSize,
    onPageChange,
    onPageSizeChange,
    filters,
    onFilterChange,
    onExport,
}: OrdersTableProps) {
    const { toast } = useToast();
    const [invoiceLoading, setInvoiceLoading] = useState<string | null>(null);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [pdfHtml, setPdfHtml] = useState<string | null>(null);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        if (filters.startDate && filters.endDate) {
            return { from: new Date(filters.startDate), to: new Date(filters.endDate) };
        }
        return undefined;
    });
    const [deliveryDateRange, setDeliveryDateRange] = useState<DateRange | undefined>(() => {
        if (filters.startDeliveryDate && filters.endDeliveryDate) {
            return { from: new Date(filters.startDeliveryDate), to: new Date(filters.endDeliveryDate) };
        }
        return undefined;
    });

    // Update local state when filters prop changes (e.g. initial load or URL change)
    // Note: This might cause a re-render loop if onFilterChange updates filters immediately and we sync back. 
    // But since filters come from parent (OrdersClient -> useTableQuery -> URL), it should be fine.
    // However, to be safe and simple, we initialize state. If filters change externally, we might need useEffect.
    // Let's rely on initialization for now as it solves the F5 refresh case. 
    // If user navigates back/forward, they might not see date update without useEffect. 
    // Let's add useEffect for full sync.
    useEffect(() => {
        if (filters.startDate && filters.endDate) {
            setDateRange({ from: new Date(filters.startDate), to: new Date(filters.endDate) });
        } else if (!filters.startDate && !filters.endDate) {
            setDateRange(undefined);
        }

        if (filters.startDeliveryDate && filters.endDeliveryDate) {
            setDeliveryDateRange({ from: new Date(filters.startDeliveryDate), to: new Date(filters.endDeliveryDate) });
        } else if (!filters.startDeliveryDate && !filters.endDeliveryDate) {
            setDeliveryDateRange(undefined);
        }
    }, [filters.startDate, filters.endDate, filters.startDeliveryDate, filters.endDeliveryDate]);


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

    const getStatusVariant = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.DELIVERED: return 'default';
            case OrderStatus.SHIPPED: return 'secondary';
            case OrderStatus.CANCELLED:
            case OrderStatus.UNSUPPLIED: 
            case OrderStatus.WAITING_STOCK: return 'destructive';
            case OrderStatus.WAITING_PICKING:
            case OrderStatus.PICKING:
            case OrderStatus.PICKED:
            case OrderStatus.PACKING:
            case OrderStatus.PACKED: return 'outline';
            default: return 'outline';
        }
    };

    const getStatusColorClass = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.DELIVERED: return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
            case OrderStatus.SHIPPED: return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
            case OrderStatus.CANCELLED:
            case OrderStatus.UNSUPPLIED: return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
            case OrderStatus.CREATED: return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
            case OrderStatus.WAITING_STOCK: return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
            case OrderStatus.WAITING_PICKING: return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
            case OrderStatus.PICKING: return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
            case OrderStatus.PICKED: return 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200';
            case OrderStatus.PACKING: return 'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200';
            case OrderStatus.PACKED: return 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200';
            case OrderStatus.INVOICED: return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
            case OrderStatus.RETURNED: return 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200';
            case OrderStatus.REPACK: return 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200';
            case OrderStatus.UNDELIVERED: return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
            default: return '';
        }
    }

    const getStatusLabel = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.CREATED: return 'Oluşturuldu';
            case OrderStatus.WAITING_STOCK: return 'Stok Bekliyor';
            case OrderStatus.WAITING_PICKING: return 'Toplama Bekliyor';
            case OrderStatus.PICKING: return 'Toplanıyor';
            case OrderStatus.PICKED: return 'Toplandı';
            case OrderStatus.PACKING: return 'Paketleniyor';
            case OrderStatus.PACKED: return 'Paketlendi';
            case OrderStatus.INVOICED: return 'Faturalandı';
            case OrderStatus.SHIPPED: return 'Kargoya Verildi';
            case OrderStatus.DELIVERED: return 'Teslim Edildi';
            case OrderStatus.CANCELLED: return 'İptal Edildi';
            case OrderStatus.RETURNED: return 'İade Edildi';
            case OrderStatus.UNSUPPLIED: return 'Tedarik Edilemedi';
            case OrderStatus.REPACK: return 'Yeniden Paketle';
            case OrderStatus.UNDELIVERED: return 'Teslim Edilemedi';
            default: return status;
        }
    }

    const getDeliveryCountdown = (agreedDeliveryDate: string | undefined) => {
        if (!agreedDeliveryDate) return { text: '-', isOverdue: false, isUrgent: false };

        const now = new Date();
        const deadline = new Date(agreedDeliveryDate);
        const diffMs = deadline.getTime() - now.getTime();

        if (diffMs <= 0) {
            // Overdue
            const overdueDiffMs = Math.abs(diffMs);
            const hours = Math.floor(overdueDiffMs / (1000 * 60 * 60));
            const minutes = Math.floor((overdueDiffMs % (1000 * 60 * 60)) / (1000 * 60));

            if (hours >= 24) {
                const days = Math.floor(hours / 24);
                return { text: `${days} gün gecikti`, isOverdue: true, isUrgent: true };
            }
            return { text: `${hours} sa ${minutes} dk gecikti`, isOverdue: true, isUrgent: true };
        }

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return { text: `${days} gün ${remainingHours} sa`, isOverdue: false, isUrgent: false };
        }

        const isUrgent = hours < 4; // Less than 4 hours is urgent
        return { text: `${String(hours).padStart(2, '0')} sa ${String(minutes).padStart(2, '0')} dk`, isOverdue: false, isUrgent };
    }

    const handleSort = (field: string) => {
        const currentSortBy = filters.sortBy;
        const currentSortOrder = filters.sortOrder || 'DESC';

        if (currentSortBy === field) {
            // Toggle sort order
            onFilterChange({
                ...filters,
                sortBy: field,
                sortOrder: currentSortOrder === 'ASC' ? 'DESC' : 'ASC',
            });
        } else {
            // New field, default to DESC
            onFilterChange({
                ...filters,
                sortBy: field,
                sortOrder: 'DESC',
            });
        }
    };

    const handleCreateInvoice = async (orderId: string) => {
        setInvoiceLoading(orderId);
        try {
            const invoice = await createInvoiceFromOrder(orderId);
            if (invoice.status === 'SUCCESS') {
                const pdf = await getInvoicePdf(invoice.id);
                setPdfHtml(pdf.html);
                setShowPdfModal(true);
            } else {
                toast({
                    variant: "destructive",
                    title: "Hata",
                    description: `Fatura oluşturulamadı: ${invoice.errorMessage || 'Bilinmeyen hata'}`
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "İşlem Başarısız",
                description: `Fatura oluşturma hatası: ${error.message}`
            });
        } finally {
            setInvoiceLoading(null);
        }
    };

    const handleBulkInvoice = async () => {
        if (selectedIds.size === 0) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: "Lütfen en az bir sipariş seçin"
            });
            return;
        }

        setBulkLoading(true);
        try {
            const res = await fetch(`/api/invoices/create-bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ orderIds: Array.from(selectedIds) }),
            });
            const data = await res.json();
            if (res.ok) {
                toast({
                    title: "İşlem Tamamlandı",
                    description: `Başarılı: ${data.success?.length || 0}, Başarısız: ${data.failed?.length || 0}`,
                    duration: 5000,
                    variant: 'success',
                });
                setSelectedIds(new Set());
            } else {
                toast({
                    variant: "destructive",
                    title: "Toplu Fatura Hatası",
                    description: data.message || 'Toplu fatura oluşturulamadı',
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "İşlem Başarısız",
                description: error.message,
            });
        } finally {
            setBulkLoading(false);
        }
    };

    const handleCreateShipment = async (orderId: string) => {
        setInvoiceLoading(orderId); // Re-using loading state for button spinner
        try {
            const res = await fetch(`/api/orders/${orderId}/create-shipment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}), // Empty body for now, can extend later
            });
            const data = await res.json();

            if (data.success) {
                toast({
                    title: "Başarılı",
                    description: data.message,
                    variant: 'success',
                });
                // Ideally refresh orders or update local state
                // window.location.reload(); // Simple refresh for now or trigger parent refresh
            } else {
                toast({
                    variant: "destructive",
                    title: "Hata",
                    description: data.message,
                });
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: error.message || "Entegrasyon hatası",
            });
        } finally {
            setInvoiceLoading(null);
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Filter Section */}
            <Card className="shadow-sm border-muted">
                <CardHeader className="pb-3 border-b bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-primary" />
                        <CardTitle className="text-base font-medium">Sipariş Filtreleri</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    {/* Row 1: Comboboxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {/* Mağaza (Store) */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Mağaza</label>
                            <Combobox
                                options={[
                                    { value: "", label: "Tümü" },
                                    ...stores.map(s => ({ value: s.id, label: s.name }))
                                ]}
                                value={filters.storeId || ""}
                                onValueChange={(val) => onFilterChange({ ...filters, storeId: val })}
                                placeholder="Mağaza Seç..."
                                searchPlaceholder="Mağaza ara..."
                                emptyMessage="Mağaza bulunamadı."
                                className="h-9"
                            />
                        </div>

                        {/* Sipariş Durumu */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Sipariş Durumu</label>
                            <Combobox
                                options={[
                                    { value: "", label: "Tümü" },
                                    { value: "WAITING_STOCK", label: "Stok Bekliyor" },
                                    { value: "WAITING_PICKING", label: "Toplama Bekliyor" },
                                    { value: "PICKING", label: "Toplanıyor" },
                                    { value: "PICKED", label: "Toplandı" },
                                    { value: "PACKING", label: "Paketleniyor" },
                                    { value: "PACKED", label: "Paketlendi" },
                                    { value: "INVOICED", label: "Faturalandı" },
                                    { value: "SHIPPED", label: "Kargoya Verildi" },
                                    { value: "DELIVERED", label: "Teslim Edildi" },
                                    { value: "CANCELLED", label: "İptal Edildi" },
                                    { value: "RETURNED", label: "İade Edildi" },
                                    { value: "UNSUPPLIED", label: "Tedarik Edilemedi" },
                                    { value: "REPACK", label: "Yeniden Paketle" },
                                    { value: "UNDELIVERED", label: "Teslim Edilemedi" },
                                ]}
                                value={filters.status || ""}
                                onValueChange={(val) => onFilterChange({ ...filters, status: val })}
                                placeholder="Durum Seç..."
                                searchPlaceholder="Durum ara..."
                                emptyMessage="Durum bulunamadı."
                                className="h-9"
                            />
                        </div>

                        {/* Tarih Aralığı */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Sipariş Tarihi</label>
                            <DatePickerWithRange
                                date={dateRange}
                                setDate={(val) => {
                                    setDateRange(val);
                                    if (val?.from) {
                                        const startDate = new Date(val.from);
                                        startDate.setHours(0, 0, 0, 0);
                                        const endDate = val.to ? new Date(val.to) : new Date(val.from);
                                        endDate.setHours(23, 59, 59, 999);

                                        onFilterChange({
                                            ...filters,
                                            startDate: startDate.toISOString(),
                                            endDate: endDate.toISOString()
                                        });
                                    } else {
                                        const newFilters = { ...filters };
                                        delete newFilters.startDate;
                                        delete newFilters.endDate;
                                        onFilterChange(newFilters);
                                    }
                                }}
                                className="h-9"
                            />
                        </div>

                        {/* Beklenen Kargolama Tarihi */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Beklenen Kargolama</label>
                            <DatePickerWithRange
                                date={deliveryDateRange}
                                setDate={(val) => {
                                    setDeliveryDateRange(val);
                                    if (val?.from) {
                                        const startDate = new Date(val.from);
                                        startDate.setHours(0, 0, 0, 0);
                                        const endDate = val.to ? new Date(val.to) : new Date(val.from);
                                        endDate.setHours(23, 59, 59, 999);

                                        onFilterChange({
                                            ...filters,
                                            startDeliveryDate: startDate.toISOString(),
                                            endDeliveryDate: endDate.toISOString()
                                        });
                                    } else {
                                        const newFilters = { ...filters };
                                        delete newFilters.startDeliveryDate;
                                        delete newFilters.endDeliveryDate;
                                        onFilterChange(newFilters);
                                    }
                                }}
                                className="h-9"
                            />
                        </div>

                        {/* Sipariş No */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Sipariş No</label>
                            <Input
                                className="h-9"
                                placeholder="Sipariş No..."
                                value={filters.orderNumber || ''}
                                onChange={(e) => onFilterChange({ ...filters, orderNumber: e.target.value })}
                            />
                        </div>

                        {/* Paket Numarası */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Paket Numarası</label>
                            <Input
                                className="h-9"
                                placeholder="Paket No..."
                                value={filters.packageId || ''}
                                onChange={(e) => onFilterChange({ ...filters, packageId: e.target.value })}
                            />
                        </div>

                        {/* Müşteri Adı Soyadı */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Müşteri Adı Soyadı</label>
                            <Input
                                className="h-9"
                                placeholder="Müşteri Ara..."
                                value={filters.customerName || ''}
                                onChange={(e) => onFilterChange({ ...filters, customerName: e.target.value })}
                            />
                        </div>

                        {/* Mikro İhracat */}
                        <div className="space-y-1.5 flex flex-col justify-end">
                            <label className="text-xs font-medium text-muted-foreground">Mikro İhracat</label>
                            <div className="flex items-center space-x-2 h-9 px-1">
                                <Switch
                                    checked={filters.micro === true}
                                    onCheckedChange={(checked) => onFilterChange({ ...filters, micro: checked ? true : undefined })}
                                    className="scale-90"
                                />
                                <span className="text-sm text-foreground">
                                    {filters.micro === true ? 'Evet' : 'Tümü'}
                                </span>
                            </div>
                        </div>

                        {/* Filtreleri Temizle */}
                        <div className="space-y-1.5 flex flex-col justify-end">
                            <label className="text-xs font-medium text-muted-foreground opacity-0">İşlem</label>
                            <Button
                                variant="outline"
                                className="h-9 w-full text-muted-foreground hover:text-foreground border-dashed"
                                onClick={() => {
                                    onFilterChange({});
                                    setDateRange(undefined);
                                    setDeliveryDateRange(undefined);
                                }}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Filtreleri Temizle
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>



            {/* Data Table */}
            <Card className="shadow-md border-muted">
                <CardHeader className="pb-3 flex flex-row items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <CardTitle className="text-base font-medium">Siparişler</CardTitle>
                    <div className="flex items-center gap-2">
                        {selectedIds.size > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={handleBulkInvoice}
                                disabled={bulkLoading}
                            >
                                {bulkLoading ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <FileText className="w-4 h-4 mr-2" />
                                )}
                                Toplu Fatura Kes ({selectedIds.size})
                            </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={onExport}>
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            Excele Aktar
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[50px] text-center">
                                        <Checkbox
                                            checked={selectedIds.size === orders.length && orders.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead className="font-semibold">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="-ml-3 h-8 data-[state=open]:bg-accent"
                                            onClick={() => handleSort('orderNumber')}
                                        >
                                            Sipariş No
                                            {filters.sortBy === 'orderNumber' ? (
                                                filters.sortOrder === 'ASC' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                            ) : (
                                                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                                            )}
                                        </Button>
                                    </TableHead>
                                                    <TableHead className="font-semibold">Mağaza</TableHead>
                                    <TableHead className="font-semibold">Müşteri</TableHead>
                                    <TableHead className="font-semibold">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="-ml-3 h-8 data-[state=open]:bg-accent"
                                            onClick={() => handleSort('orderDate')}
                                        >
                                            Tarih
                                            {filters.sortBy === 'orderDate' ? (
                                                filters.sortOrder === 'ASC' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                            ) : (
                                                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                                            )}
                                        </Button>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="-ml-3 h-8 data-[state=open]:bg-accent"
                                            onClick={() => handleSort('agreedDeliveryDate')}
                                        >
                                            Beklenen Kargolama
                                            {filters.sortBy === 'agreedDeliveryDate' ? (
                                                filters.sortOrder === 'ASC' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                            ) : (
                                                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                                            )}
                                        </Button>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="-ml-3 h-8 data-[state=open]:bg-accent"
                                            onClick={() => handleSort('totalPrice')}
                                        >
                                            Tutar
                                            {filters.sortBy === 'totalPrice' ? (
                                                filters.sortOrder === 'ASC' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                            ) : (
                                                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                                            )}
                                        </Button>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="-ml-3 h-8 data-[state=open]:bg-accent"
                                            onClick={() => handleSort('status')}
                                        >
                                            Durum
                                            {filters.sortBy === 'status' ? (
                                                filters.sortOrder === 'ASC' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
                                            ) : (
                                                <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                                            )}
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-right font-semibold">İşlemler</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                Loading data...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                                            Kayıt bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((order) => (
                                        <React.Fragment key={order.id}>
                                            <TableRow className="hover:bg-muted/30 group transition-colors data-[state=selected]:bg-muted" data-state={selectedIds.has(order.id) ? "selected" : ""}>
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={selectedIds.has(order.id)}
                                                        onCheckedChange={() => toggleSelect(order.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => toggleExpand(order.id)}>
                                                        {expandedIds.has(order.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <Link href={`/orders/${order.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                                                            {order.orderNumber}
                                                        </Link>
                                                        <span className="text-xs text-muted-foreground font-mono">{
                                                            // @ts-ignore
                                                            order.packageId
                                                        }</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-muted-foreground">
                                                        {order.store?.name || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                            {order.customer?.firstName?.charAt(0) || 'M'}
                                                        </div>
                                                        <span className="text-sm">
                                                            {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Misafir'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                                                    {new Date(order.orderDate).toLocaleString('tr-TR', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        second: '2-digit'
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-sm whitespace-nowrap">
                                                    {(() => {
                                                        // Aktif bekleyen durumlar - sayaç göster
                                                        const activeStatuses = [
                                                            OrderStatus.WAITING_STOCK,
                                                            OrderStatus.WAITING_PICKING,
                                                            OrderStatus.PICKING,
                                                            OrderStatus.PICKED,
                                                            OrderStatus.PACKING,
                                                            OrderStatus.PACKED,
                                                            OrderStatus.INVOICED,
                                                        ];
                                                        const isActiveOrder = activeStatuses.includes(order.status);

                                                        if (isActiveOrder) {
                                                            // Sayaç göster
                                                            const countdown = getDeliveryCountdown(order.agreedDeliveryDate);
                                                            return (
                                                                <span className={cn(
                                                                    countdown.isOverdue && "text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded",
                                                                    countdown.isUrgent && !countdown.isOverdue && "text-orange-600 font-medium",
                                                                    !countdown.isOverdue && !countdown.isUrgent && "text-muted-foreground"
                                                                )}>
                                                                    {countdown.text}
                                                                </span>
                                                            );
                                                        } else {
                                                            // Tamamlanan durumlar - tarih göster
                                                            if (!order.agreedDeliveryDate) return <span className="text-muted-foreground">-</span>;
                                                            return (
                                                                <span className="text-muted-foreground">
                                                                    {new Date(order.agreedDeliveryDate).toLocaleString('tr-TR', {
                                                                        day: '2-digit',
                                                                        month: '2-digit',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        second: '2-digit'
                                                                    })}
                                                                </span>
                                                            );
                                                        }
                                                    })()}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(order.totalPrice)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={cn("font-medium shadow-none", getStatusColorClass(order.status))} variant="outline">
                                                        {getStatusLabel(order.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => handleCreateInvoice(order.id)}
                                                            disabled={invoiceLoading === order.id}
                                                            title="Fatura Oluştur"
                                                        >
                                                            {invoiceLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                                        </Button>

                                                        {!order.cargoTrackingNumber && order.store?.type === 'MANUAL' && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                                title="Aras Kargo'ya Gönder"
                                                                onClick={() => handleCreateShipment(order.id)}
                                                                disabled={invoiceLoading === order.id}
                                                            >
                                                                {invoiceLoading === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                            </Button>
                                                        )}

                                                        {order.cargoTrackingNumber && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                                title="Aras Kargo Barkodu"
                                                                onClick={async () => {
                                                                    // Same logic as before
                                                                    try {
                                                                        const res = await fetch(`/api/orders/${order.id}/label`, {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                        });
                                                                        if (res.ok) {
                                                                            toast({
                                                                                title: "Başarılı",
                                                                                description: "Barkod başarıyla oluşturuldu",
                                                                                variant: 'success',
                                                                                duration: 3000,
                                                                            });
                                                                        } else {
                                                                            const d = await res.json();
                                                                            toast({
                                                                                variant: "destructive",
                                                                                title: "Hata",
                                                                                description: d.message || "Barkod oluşturulamadı",
                                                                            });
                                                                        }
                                                                    } catch (e: any) {
                                                                        toast({
                                                                            variant: "destructive",
                                                                            title: "Hata",
                                                                            description: e.message || "Bir hata oluştu",
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                <Truck className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            title="Detay Görüntüle"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Expanded View */}
                                            {expandedIds.has(order.id) && (
                                                <TableRow className="bg-muted/5 hover:bg-muted/5">
                                                    <TableCell colSpan={10} className="p-0">
                                                        <div className="p-4 pl-12 bg-muted/20 border-b shadow-inner">
                                                            <div className="bg-background rounded-md border overflow-hidden">
                                                                <div className="bg-muted/50 px-4 py-2 border-b flex justify-between items-center">
                                                                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Sipariş İçeriği</span>
                                                                    <span className="text-xs text-muted-foreground">ID: {order.id}</span>
                                                                </div>
                                                                {order.items && order.items.length > 0 ? (
                                                                    <Table>
                                                                        <TableHeader>
                                                                            <TableRow className="hover:bg-transparent">
                                                                                <TableHead className="h-8 text-xs">Ürün Adı</TableHead>
                                                                                <TableHead className="h-8 text-xs">SKU</TableHead>
                                                                                <TableHead className="h-8 text-xs text-center">Adet</TableHead>
                                                                                <TableHead className="h-8 text-xs text-right">Birim Fiyat</TableHead>
                                                                                <TableHead className="h-8 text-xs text-right">Toplam</TableHead>
                                                                            </TableRow>
                                                                        </TableHeader>
                                                                        <TableBody>
                                                                            {order.items.map((item) => (
                                                                                <TableRow key={item.id} className="hover:bg-muted/20">
                                                                                    <TableCell className="py-2 text-sm">{item.productName}</TableCell>
                                                                                    <TableCell className="py-2 text-xs font-mono text-muted-foreground">{item.sku || '-'}</TableCell>
                                                                                    <TableCell className="py-2 text-center">{item.quantity}</TableCell>
                                                                                    <TableCell className="py-2 text-right">
                                                                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.unitPrice)}
                                                                                    </TableCell>
                                                                                    <TableCell className="py-2 text-right font-medium">
                                                                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.unitPrice * item.quantity)}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
                                                                        </TableBody>
                                                                    </Table>
                                                                ) : (
                                                                    <div className="p-8 text-center text-muted-foreground text-sm">Ürün bilgisi bulunamadı.</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination settings */}
            <DataTablePagination
                page={currentPage}
                pageSize={pageSize}
                totalPages={totalPages}
                totalItems={totalPages * pageSize}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
            />

            {/* PDF Modal */}
            {showPdfModal && pdfHtml && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex justify-between items-center bg-muted/30">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="w-5 h-5" /> Fatura Önizleme
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setShowPdfModal(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                        <iframe
                            srcDoc={pdfHtml}
                            className="flex-1 w-full border-0 bg-white"
                            title="Fatura"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

