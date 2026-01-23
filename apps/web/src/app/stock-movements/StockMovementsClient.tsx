'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Search, ArrowUpRight, ArrowDownLeft, Filter, X } from 'lucide-react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface StockMovement {
    id: string;
    shelfId: string;
    shelf?: {
        id: string;
        name: string;
        barcode: string;
    };
    productId: string;
    product?: {
        id: string;
        name: string;
        barcode: string;
        sku: string;
    };
    type: string;
    direction: string;
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    orderId?: string;
    order?: {
        id: string;
        orderNumber: string;
    };
    routeId?: string;
    route?: {
        id: string;
        name: string;
    };
    sourceShelfId?: string;
    sourceShelf?: {
        id: string;
        name: string;
    };
    targetShelfId?: string;
    targetShelf?: {
        id: string;
        name: string;
    };
    referenceNumber?: string;
    notes?: string;
    userId?: string;
    user?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    createdAt: string;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
    PICKING: 'Toplama',
    PACKING_IN: 'Paketleme Girişi',
    PACKING_OUT: 'Paketleme Çıkışı',
    RECEIVING: 'Mal Kabul',
    TRANSFER: 'Transfer',
    ADJUSTMENT: 'Düzeltme',
    RETURN: 'İade',
    CANCEL: 'İptal',
};

const MOVEMENT_TYPE_COLORS: Record<string, string> = {
    PICKING: 'bg-blue-100 text-blue-800',
    PACKING_IN: 'bg-purple-100 text-purple-800',
    PACKING_OUT: 'bg-green-100 text-green-800',
    RECEIVING: 'bg-yellow-100 text-yellow-800',
    TRANSFER: 'bg-gray-100 text-gray-800',
    ADJUSTMENT: 'bg-orange-100 text-orange-800',
    RETURN: 'bg-red-100 text-red-800',
    CANCEL: 'bg-red-100 text-red-800',
};

export function StockMovementsClient() {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const fetchMovements = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('limit', String(pageSize));

            if (typeFilter) params.append('type', typeFilter);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const res = await fetch(`/api/shelves/movements/history?${params}`, {
                credentials: 'include',
            });
            const data = await res.json();
            setMovements(data.data || []);
            if (data.meta) {
                setTotalPages(data.meta.totalPages);
                setTotal(data.meta.total);
            }
        } catch (error) {
            console.error('Failed to fetch movements', error);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageSize, typeFilter, startDate, endDate]);

    useEffect(() => {
        fetchMovements();
    }, [fetchMovements]);

    const clearFilters = () => {
        setTypeFilter('');
        setSearchQuery('');
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    const filteredMovements = movements.filter(m => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            m.product?.name?.toLowerCase().includes(query) ||
            m.product?.barcode?.toLowerCase().includes(query) ||
            m.product?.sku?.toLowerCase().includes(query) ||
            m.shelf?.name?.toLowerCase().includes(query) ||
            m.order?.orderNumber?.toLowerCase().includes(query) ||
            m.route?.name?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Stok Hareketleri</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filtreler
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchMovements}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Yenile
                    </Button>
                </div>
            </div>

            {showFilters && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Filtreler</CardTitle>
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                <X className="w-4 h-4 mr-1" />
                                Temizle
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label>Hareket Tipi</Label>
                                <Select value={typeFilter || 'all'} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tümü" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tümü</SelectItem>
                                        <SelectItem value="PICKING">Toplama</SelectItem>
                                        <SelectItem value="PACKING_IN">Paketleme Girişi</SelectItem>
                                        <SelectItem value="PACKING_OUT">Paketleme Çıkışı</SelectItem>
                                        <SelectItem value="RECEIVING">Mal Kabul</SelectItem>
                                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                                        <SelectItem value="ADJUSTMENT">Düzeltme</SelectItem>
                                        <SelectItem value="RETURN">İade</SelectItem>
                                        <SelectItem value="CANCEL">İptal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Arama</Label>
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Ürün, raf, sipariş..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Başlangıç Tarihi</Label>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Bitiş Tarihi</Label>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarih</TableHead>
                                <TableHead>Tip</TableHead>
                                <TableHead>Yön</TableHead>
                                <TableHead>Ürün</TableHead>
                                <TableHead>Raf</TableHead>
                                <TableHead className="text-right">Miktar</TableHead>
                                <TableHead className="text-right">Önceki</TableHead>
                                <TableHead className="text-right">Sonraki</TableHead>
                                <TableHead>Sipariş / Rota</TableHead>
                                <TableHead>Kullanıcı</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8">
                                        <div className="flex items-center justify-center">
                                            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                                            Yükleniyor...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredMovements.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                                        Stok hareketi bulunamadı
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredMovements.map((movement) => (
                                    <TableRow key={movement.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {format(new Date(movement.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={MOVEMENT_TYPE_COLORS[movement.type] || 'bg-gray-100 text-gray-800'}>
                                                {MOVEMENT_TYPE_LABELS[movement.type] || movement.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {movement.direction === 'IN' ? (
                                                <span className="flex items-center text-green-600">
                                                    <ArrowDownLeft className="w-4 h-4 mr-1" />
                                                    Giriş
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-red-600">
                                                    <ArrowUpRight className="w-4 h-4 mr-1" />
                                                    Çıkış
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="max-w-[200px]">
                                                <div className="font-medium truncate">{movement.product?.name || '-'}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {movement.product?.barcode || movement.product?.sku}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium">{movement.shelf?.name || '-'}</div>
                                            {movement.sourceShelf && movement.targetShelf && (
                                                <div className="text-xs text-muted-foreground">
                                                    {movement.sourceShelf.name} → {movement.targetShelf.name}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {movement.direction === 'IN' ? '+' : '-'}{movement.quantity}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {movement.quantityBefore}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {movement.quantityAfter}
                                        </TableCell>
                                        <TableCell>
                                            {movement.order ? (
                                                <div className="text-sm">
                                                    <span className="text-primary">{movement.order.orderNumber}</span>
                                                </div>
                                            ) : movement.route ? (
                                                <div className="text-sm text-muted-foreground">
                                                    {movement.route.name}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {movement.user ? (
                                                <span className="text-sm">
                                                    {movement.user.firstName} {movement.user.lastName}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
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
                onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
        </div>
    );
}
