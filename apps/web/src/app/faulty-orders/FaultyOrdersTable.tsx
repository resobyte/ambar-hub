'use client';

import { useState, useEffect } from 'react';
import { getFaultyOrders, FaultyOrder } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { Search, Filter, X, AlertOctagon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function FaultyOrdersTable() {
    const [orders, setOrders] = useState<FaultyOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const limit = 10;

    // Filters
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [customerName, setCustomerName] = useState('');
    const [orderNumber, setOrderNumber] = useState('');
    const [barcode, setBarcode] = useState('');

    useEffect(() => {
        fetchOrders();
    }, [page, dateRange]);

    // Simple debounce for text inputs
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders();
        }, 500);
        return () => clearTimeout(timer);
    }, [customerName, orderNumber, barcode]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (dateRange?.from) filters.startDate = dateRange.from.toISOString();
            if (dateRange?.to) filters.endDate = dateRange.to.toISOString();
            if (customerName) filters.customerName = customerName;
            if (orderNumber) filters.orderNumber = orderNumber;
            if (barcode) filters.barcode = barcode;

            const res = await getFaultyOrders(page, limit, filters);

            if (res.success && Array.isArray(res.data)) {
                setOrders(res.data);
                setTotal(res.meta.total);
                setTotalPages(res.meta.totalPages);
            } else {
                setOrders([]);
                setTotal(0);
                setTotalPages(0);
            }
        } catch (error) {
            console.error('Hatalı siparişler yüklenemedi:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setDateRange(undefined);
        setCustomerName('');
        setOrderNumber('');
        setBarcode('');
        setPage(1);
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        return (
            <Pagination className="mt-4">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                    </PaginationItem>

                    {Array.from({ length: totalPages }).map((_, i) => {
                        const p = i + 1;
                        if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1)) {
                            return (
                                <PaginationItem key={p}>
                                    <PaginationLink
                                        isActive={page === p}
                                        onClick={() => setPage(p)}
                                        className="cursor-pointer"
                                    >
                                        {p}
                                    </PaginationLink>
                                </PaginationItem>
                            );
                        } else if (p === page - 2 || p === page + 2) {
                            return <PaginationItem key={p}><PaginationEllipsis /></PaginationItem>;
                        }
                        return null;
                    })}

                    <PaginationItem>
                        <PaginationNext
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        );
    };

    return (
        <div className="space-y-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Hatalı Siparişler</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Filter className="w-5 h-5" /> Filtreler
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Tarih Aralığı</Label>
                            <DatePickerWithRange
                                date={dateRange}
                                setDate={(date) => {
                                    if (date?.from) date.from.setHours(0, 0, 0, 0);
                                    if (date?.to) date.to.setHours(23, 59, 59, 999);
                                    setDateRange(date);
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Sipariş No</Label>
                            <Input
                                placeholder="Sipariş Numarası..."
                                value={orderNumber}
                                onChange={(e) => setOrderNumber(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Müşteri</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Müşteri Adı..."
                                    className="pl-8"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Ürün / Barkod</Label>
                            <Input
                                placeholder="Eksik ürün barkodu..."
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end lg:col-span-4">
                            <Button variant="outline" onClick={clearFilters} className="ml-auto">
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
                                <TableHead>Müşteri</TableHead>
                                <TableHead>Entegrasyon</TableHead>
                                <TableHead>Eksik Ürünler</TableHead>
                                <TableHead>Tutar</TableHead>
                                <TableHead>Deneme</TableHead>
                                <TableHead>Tarih</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Hatalı sipariş bulunmuyor.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                                        <TableCell>{order.customerName || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{order.integration?.name || '-'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {order.missingBarcodes?.slice(0, 3).map((bc, i) => (
                                                    <Badge key={i} variant="destructive" className="font-mono text-xs">
                                                        {bc}
                                                    </Badge>
                                                ))}
                                                {order.missingBarcodes?.length > 3 && (
                                                    <Badge variant="outline" className="text-xs">
                                                        +{order.missingBarcodes.length - 3}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {order.totalPrice
                                                ? `${Number(order.totalPrice).toFixed(2)} ${order.currencyCode || 'TRY'}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{order.retryCount}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {renderPagination()}
        </div>
    );
}
