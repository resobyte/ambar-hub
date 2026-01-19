'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, ShoppingCart, Trash2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useTableQuery } from '@/hooks/use-table-query';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Product {
    id: string;
    name: string;
    barcode: string;
    sku: string;
}

interface Supplier {
    id: string;
    name: string;
}

interface PurchaseOrderItem {
    productId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitPrice: number;
    product?: Product;
}

interface PurchaseOrder {
    id: string;
    orderNumber: string;
    supplierId: string;
    supplier?: Supplier;
    status: string;
    totalAmount: number;
    orderDate: string;
    expectedDate?: string;
    items: PurchaseOrderItem[];
    type: string;

}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Taslak', color: 'bg-gray-100 text-gray-800' },
    ORDERED: { label: 'Sipariş Verildi', color: 'bg-blue-100 text-blue-800' },
    PARTIAL: { label: 'Kısmi Kabul', color: 'bg-yellow-100 text-yellow-800' },
    COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
    CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-800' },
};

export function PurchasesList() {
    // URL-synced table query state
    const { page, pageSize, filters, setPage, setPageSize, setFilter, clearFilters: clearUrlFilters } = useTableQuery({
        defaultPage: 1,
        defaultPageSize: 10,
    });

    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [invoiceDocNo, setInvoiceDocNo] = useState('');
    const [importing, setImporting] = useState(false);
    const { toast } = useToast();

    // Filters
    const search = filters.search || '';
    const supplierId = filters.supplierId || '';
    const status = filters.status || 'ALL';
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

    const [formData, setFormData] = useState<{
        supplierId: string;
        orderDate: string;
        expectedDate: string;
        notes: string;
        type: string;
        invoiceNumber: string;

        items: { productId: string; productName: string; orderedQuantity: number; unitPrice: number }[];
    }>({
        supplierId: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDate: '',
        notes: '',
        type: 'MANUAL',
        invoiceNumber: '',

        items: [{ productId: '', productName: '', orderedQuantity: 1, unitPrice: 0 }],
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('limit', String(pageSize));
            if (search) params.append('search', search);
            if (supplierId && supplierId !== 'ALL') params.append('supplierId', supplierId);
            if (status && status !== 'ALL') params.append('status', status);
            if (startDate) params.append('startDate', startDate.toISOString());
            if (endDate) params.append('endDate', endDate.toISOString());

            const [poRes, supRes, prodRes] = await Promise.all([
                fetch(`${API_URL}/purchases?${params}`, { credentials: 'include' }),
                fetch(`${API_URL}/suppliers?page=1&limit=100`, { credentials: 'include' }),
                fetch(`${API_URL}/products?page=1&limit=500`, { credentials: 'include' }),
            ]);
            const poData = await poRes.json();
            const supData = await supRes.json();
            const prodData = await prodRes.json();
            setPurchases(poData.data || []);
            setTotal(poData.meta?.total || 0);
            setTotalPages(Math.ceil((poData.meta?.total || 0) / pageSize));
            setSuppliers(supData.data || []);
            setProducts(prodData.data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Veriler yüklenemedi' });
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, supplierId, status, startDate, endDate, toast]);

    useEffect(() => { fetchData(); }, [fetchData]);



    const handleCreateClick = () => {
        setIsSelectionModalOpen(true);
    };

    const handleManualCreate = () => {
        setIsSelectionModalOpen(false);
        setFormData({
            supplierId: suppliers[0]?.id || '',
            orderDate: new Date().toISOString().split('T')[0],
            expectedDate: '',
            notes: '',
            type: 'MANUAL',
            invoiceNumber: '',

            items: [{ productId: products[0]?.id || '', productName: '', orderedQuantity: 1, unitPrice: 0 }],
        });
        setIsModalOpen(true);
    };

    const handleImportInvoice = async () => {
        if (!invoiceDocNo) return;
        setImporting(true);
        try {
            const res = await fetch(`${API_URL}/purchases/import-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ docNo: invoiceDocNo }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Fatura bulunamadı veya uygun değil');
            }

            const resData = await res.json();
            const data = resData.data || resData;

            // Populate form data
            setFormData({
                supplierId: data.supplierId || '',
                orderDate: data.orderDate ? new Date(data.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                expectedDate: '',
                notes: `Fatura No: ${data.invoiceNumber}`,
                type: 'INVOICE',
                invoiceNumber: data.invoiceNumber,

                items: data.items.map((item: any) => {
                    // Try to match product by ID (backend) or SKU/Barcode (frontend fallback)
                    const matchedProduct = products.find(p =>
                        p.id === item.productId ||
                        (item.productCode && p.sku === item.productCode) ||
                        (item.productCode && p.barcode === item.productCode)
                    );

                    return {
                        productId: matchedProduct ? matchedProduct.id : (item.productId || ''),
                        productName: item.productName || '',
                        orderedQuantity: item.orderedQuantity,
                        unitPrice: item.unitPrice,
                    };
                }),
            });

            setIsSelectionModalOpen(false);
            setIsModalOpen(true);
            toast({ title: 'Başarılı', description: 'Fatura bilgileri çekildi', variant: 'success' });

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        } finally {
            setImporting(false);
        }
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { productId: products[0]?.id || '', productName: '', orderedQuantity: 1, unitPrice: 0 }],
        });
    };

    const removeItem = (index: number) => {
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index),
        });
    };

    const updateItem = (index: number, field: string, value: any) => {
        const items = [...formData.items];
        (items[index] as any)[field] = value;
        setFormData({ ...formData, items });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/purchases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Failed');
            toast({ title: 'Başarılı', description: 'Satın alma oluşturuldu', variant: 'success' });
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'İşlem başarısız' });
        }
    };

    const totalAmount = formData.items.reduce((sum, item) => sum + item.orderedQuantity * item.unitPrice, 0);

    const handleClearFilters = () => {
        clearUrlFilters();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Satın Alma</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <Button onClick={handleCreateClick}>
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Satın Alma
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filtrele</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Arama</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Sipariş no..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setFilter('search', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Tedarikçi</Label>
                            <Select
                                value={supplierId === '' ? 'ALL' : supplierId}
                                onValueChange={(v) => setFilter('supplierId', v === 'ALL' ? '' : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tümü" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tümü</SelectItem>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Durum</Label>
                            <Select
                                value={status === '' ? 'ALL' : status}
                                onValueChange={(v) => setFilter('status', v === 'ALL' ? '' : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Tümü" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tümü</SelectItem>
                                    {Object.entries(STATUS_MAP).map(([key, val]) => (
                                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end justify-end">
                            <Button variant="outline" onClick={handleClearFilters}>
                                <X className="w-4 h-4 mr-2" /> Filtreleri Temizle
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Sipariş No</TableHead>
                                <TableHead>Tedarikçi</TableHead>
                                <TableHead>Tip</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead>Toplam</TableHead>
                                <TableHead>Sipariş Tarihi</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex items-center justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : purchases.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Henüz satın alma kaydı yok
                                    </TableCell>
                                </TableRow>
                            ) : (
                                purchases.map((purchase) => {
                                    const status = STATUS_MAP[purchase.status] || { label: purchase.status, color: 'bg-gray-100' };
                                    return (
                                        <TableRow key={purchase.id}>
                                            <TableCell className="font-medium">{purchase.orderNumber}</TableCell>
                                            <TableCell className="text-muted-foreground">{purchase.supplier?.name || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {purchase.type === 'INVOICE' ? 'Fatura' : 'Manuel'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={status.color}>
                                                    {status.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {Number(purchase.totalAmount || 0).toFixed(2)} ₺
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {new Date(purchase.orderDate).toLocaleDateString('tr-TR')}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">

                                                    <Link href={`/purchases/${purchase.id}`}>
                                                        <Button variant="ghost" size="sm">Detay</Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <DataTablePagination
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                totalItems={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
            />

            <Dialog open={isSelectionModalOpen} onOpenChange={setIsSelectionModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Satın Alma Oluştur</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Button variant="outline" className="h-20 text-lg" onClick={handleManualCreate}>
                            Manuel Oluştur
                        </Button>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    veya
                                </span>
                            </div>
                        </div>
                        <div className="space-y-4 border rounded-md p-4">
                            <div className="space-y-2">
                                <Label>Faturadan Çek (Uyumsoft)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Fatura No (örn: FAT2024...)"
                                        value={invoiceDocNo}
                                        onChange={(e) => setInvoiceDocNo(e.target.value)}
                                    />
                                    <Button onClick={handleImportInvoice} disabled={importing || !invoiceDocNo}>
                                        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sorgula'}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Sadece &quot;MALALIS&quot; özel kodlu faturalar kabul edilir.
                                </p>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Yeni Satın Alma</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tedarikçi</Label>
                                <Select
                                    value={formData.supplierId}
                                    onValueChange={(v) => setFormData({ ...formData, supplierId: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tedarikçi seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Sipariş Tarihi</Label>
                                <Input type="date" value={formData.orderDate} onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })} required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Beklenen Tarih</Label>
                            <Input type="date" value={formData.expectedDate} onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })} />
                        </div>

                        <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-medium">Ürünler</h3>
                                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                                    <Plus className="w-4 h-4 mr-2" /> Ürün Ekle
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {formData.items.map((item, index) => (
                                    <div key={index} className="flex gap-2 items-end">
                                        <div className="flex-1 space-y-2">
                                            {index === 0 && <Label>Ürün</Label>}
                                            <Select
                                                value={item.productId}
                                                onValueChange={(v) => updateItem(index, 'productId', v)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Ürün seçin" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name} [{p.barcode}]</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {/* Show hint if product not matched but we have imported name */}
                                        {!item.productId && (item as any).productName && (
                                            <div className="text-xs text-amber-600 mt-1">
                                                Faturadaki: {(item as any).productName}
                                            </div>
                                        )}
                                        <div className="w-20 space-y-2">
                                            {index === 0 && <Label>Adet</Label>}
                                            <Input
                                                type="number"
                                                value={item.orderedQuantity}
                                                onChange={(e) => updateItem(index, 'orderedQuantity', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                        <div className="w-28 space-y-2">
                                            {index === 0 && <Label>Birim Fiyat</Label>}
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                        {formData.items.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="text-right mt-4 text-lg font-semibold">
                                Toplam: {totalAmount.toFixed(2)} ₺
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
                            <Button type="submit">Oluştur</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
