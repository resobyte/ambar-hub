'use client';

import { useEffect, useState } from 'react';
import { apiGetPaginated, Invoice } from '@/lib/api';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { Search, FileText, AlertCircle, CheckCircle2, Clock, Filter, X } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function InvoicesClient() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const limit = 20;

    // Filters
    const [status, setStatus] = useState<string>('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [customerName, setCustomerName] = useState('');
    const [cardCode, setCardCode] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [edocNo, setEdocNo] = useState('');

    // Modal
    const [viewPayload, setViewPayload] = useState<{ title: string; content: any } | null>(null);

    useEffect(() => {
        fetchInvoices();
    }, [page, status, dateRange, customerName, cardCode, invoiceNumber, edocNo]);

    // Simple debounce for text inputs could be added, but for now relying on effect or manual trigger? 
    // Effect triggers on every keystroke which is bad for API.
    // Let's implement a wrapper for fetch or use a separate "apply filters" logic?
    // OrdersTable tends to fetch on change. I'll add a debounce effect or just fetch.
    // Given the user request is "copy OrdersTable", OrdersTable uses individual state + handlers.
    // I'll make a `debouncedFetch` logic or just simple effect with timeout?
    // For simplicity in this iteration, I'll use a fast debounce.

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchInvoices();
        }, 500);
        return () => clearTimeout(timer);
    }, [customerName, cardCode, invoiceNumber, edocNo]);

    useEffect(() => {
        fetchInvoices();
    }, [page, status, dateRange]);


    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit };

            if (status && status !== 'all') params.status = status;
            if (dateRange?.from) params.startDate = dateRange.from.toISOString();
            if (dateRange?.to) params.endDate = dateRange.to.toISOString();
            if (customerName) params.customerName = customerName;
            if (cardCode) params.cardCode = cardCode;
            if (invoiceNumber) params.invoiceNumber = invoiceNumber;
            if (edocNo) params.edocNo = edocNo;

            const res = await apiGetPaginated<Invoice>('/invoices', { params });

            if (res.success && Array.isArray(res.data)) {
                setInvoices(res.data);
                setTotal(res.meta?.total || 0);
                setTotalPages(res.meta?.totalPages || 0);
            } else {
                setInvoices([]);
                setTotal(0);
                setTotalPages(0);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setStatus('all');
        setDateRange(undefined);
        setCustomerName('');
        setCardCode('');
        setInvoiceNumber('');
        setEdocNo('');
        setPage(1);
    };

    const getStatusBadge = (status: string) => {
        const normalized = status?.toLowerCase() || '';
        switch (normalized) {
            case 'success':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Başarılı</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Beklemede</Badge>;
            case 'error':
                return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Hata</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
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
                        // Simple logic: show first, last, current, and neighbors
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
                        <BreadcrumbPage>Faturalar</BreadcrumbPage>
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
                                    // Set full day range (00:00:00 - 23:59:59)
                                    if (date?.from) {
                                        date.from.setHours(0, 0, 0, 0);
                                    }
                                    if (date?.to) {
                                        date.to.setHours(23, 59, 59, 999);
                                    }
                                    setDateRange(date);
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Durum</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Durum seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tümü</SelectItem>
                                    <SelectItem value="SUCCESS">Başarılı</SelectItem>
                                    <SelectItem value="PENDING">Beklemede</SelectItem>
                                    <SelectItem value="ERROR">Hatalı</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Müşteri</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Ad veya Soyad ara..."
                                    className="pl-8"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Fatura No</Label>
                            <Input
                                placeholder="Örn: EMA2024..."
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>E-Belge No</Label>
                            <Input
                                placeholder="Uyumsoft No..."
                                value={edocNo}
                                onChange={(e) => setEdocNo(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Kart Kodu</Label>
                            <Input
                                placeholder="Cari Kodu..."
                                value={cardCode}
                                onChange={(e) => setCardCode(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end lg:col-span-2">
                            <Button variant="outline" onClick={clearFilters} className="w-full">
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
                                <TableHead>Fatura No</TableHead>
                                <TableHead>Sipariş No</TableHead>
                                <TableHead>Müşteri</TableHead>
                                <TableHead>Kart Kodu</TableHead>
                                <TableHead>Tutar</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead>Detaylar</TableHead>
                                <TableHead>Tarih</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : invoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        Kayıt bulunamadı.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                        <TableCell className="text-muted-foreground">{invoice.order?.orderNumber || '-'}</TableCell>
                                        <TableCell>{invoice.customerFirstName} {invoice.customerLastName}</TableCell>
                                        <TableCell className="text-xs font-mono text-muted-foreground">{invoice.cardCode}</TableCell>
                                        <TableCell className="font-medium">
                                            {Number(invoice.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currencyCode}
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(invoice.status)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => setViewPayload({ title: 'Request Payload', content: invoice.requestPayload })}
                                                >
                                                    Request
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => setViewPayload({ title: 'Response Payload', content: invoice.responsePayload })}
                                                >
                                                    Response
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(invoice.createdAt).toLocaleDateString('tr-TR')}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {renderPagination()}

            <Dialog open={!!viewPayload} onOpenChange={(open) => !open && setViewPayload(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{viewPayload?.title}</DialogTitle>
                        <DialogDescription>
                            İşlem detayları aşağıdadır.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[500px] w-full rounded-md border p-4 bg-muted/50 font-mono text-xs">
                        <pre>
                            {typeof viewPayload?.content === 'string'
                                ? viewPayload.content
                                : JSON.stringify(viewPayload?.content, null, 2)}
                        </pre>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
