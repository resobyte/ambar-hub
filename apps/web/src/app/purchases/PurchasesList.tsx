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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Search, X } from 'lucide-react';
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
import { Consumable, getConsumables } from '@/lib/api';

const isServer = typeof window === 'undefined';
const API_URL = isServer
    ? (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
    : '/api';

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
    productId?: string;
    consumableId?: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitPrice: number;
    product?: Product;
    consumable?: Consumable;
}

interface PurchaseOrder {
    id: string;
    orderNumber: string;
    supplierId: string;
    supplier?: Supplier;
    status: string;
    totalAmount: number;
    orderDate: string;
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
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const { toast } = useToast();

    // Filters
    const search = filters.search || '';
    const supplierId = filters.supplierId || '';
    const status = filters.status || 'ALL';
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

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

            const [poRes, supRes] = await Promise.all([
                fetch(`${API_URL}/purchases?${params}`, { credentials: 'include' }),
                fetch(`${API_URL}/suppliers?page=1&limit=100`, { credentials: 'include' }),
            ]);
            const poData = await poRes.json();
            const supData = await supRes.json();

            setPurchases(poData.data || []);
            setTotal(poData.meta?.total || 0);
            setTotalPages(Math.ceil((poData.meta?.total || 0) / pageSize));
            setSuppliers(supData.data || []);

        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Veriler yüklenemedi' });
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, supplierId, status, startDate, endDate, toast]);

    useEffect(() => { fetchData(); }, [fetchData]);
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
                <Link href="/purchases/create">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Yeni Satın Alma
                    </Button>
                </Link>
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

        </div>
    );
}
