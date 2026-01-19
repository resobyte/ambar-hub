'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useTableQuery } from '@/hooks/use-table-query';

export function InvoicesClient() {
    // URL-synced table query state
    const { page, pageSize, filters: urlFilters, setPage, setPageSize, setFilter, clearFilters: clearUrlFilters } = useTableQuery({
        defaultPage: 1,
        defaultPageSize: 20,
    });

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Filters from URL
    const status = urlFilters.status || 'all';
    const customerName = urlFilters.customerName || '';
    const cardCode = urlFilters.cardCode || '';
    const invoiceNumber = urlFilters.invoiceNumber || '';
    const edocNo = urlFilters.edocNo || '';
    const [dateRange, setDateRange] = useState<DateRange | undefined>();

    // Modal
    const [viewPayload, setViewPayload] = useState<{ title: string; content: any } | null>(null);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, any> = { page, limit: pageSize };

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
    }, [page, pageSize, status, dateRange, customerName, cardCode, invoiceNumber, edocNo]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleClearFilters = () => {
        clearUrlFilters();
        setDateRange(undefined);
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
                            <Select value={status} onValueChange={(v) => setFilter('status', v === 'all' ? '' : v)}>
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
                                    onChange={(e) => setFilter('customerName', e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Fatura No</Label>
                            <Input
                                placeholder="Örn: EMA2024..."
                                value={invoiceNumber}
                                onChange={(e) => setFilter('invoiceNumber', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>E-Belge No</Label>
                            <Input
                                placeholder="Uyumsoft No..."
                                value={edocNo}
                                onChange={(e) => setFilter('edocNo', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Kart Kodu</Label>
                            <Input
                                placeholder="Cari Kodu..."
                                value={cardCode}
                                onChange={(e) => setFilter('cardCode', e.target.value)}
                            />
                        </div>
                        <div className="flex items-end lg:col-span-2">
                            <Button variant="outline" onClick={handleClearFilters} className="w-full">
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

            <DataTablePagination
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                totalItems={total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
            />

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
