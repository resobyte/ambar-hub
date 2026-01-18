'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { DataTable, DataTableColumn, Badge, Spinner } from '@/components/ui';

interface Invoice {
    id: string;
    invoiceNumber: string;
    invoiceSerial: string;
    edocNo: string;
    status: string;
    cardCode: string;
    customerFirstName: string;
    customerLastName: string;
    totalAmount: number;
    currencyCode: string;
    invoiceDate: string;
    createdAt: string;
    errorMessage?: string;
}

function InvoicesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    // Get params from URL
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'ASC' | 'DESC') || 'DESC';

    const totalPages = Math.ceil(total / limit);

    // Update URL
    const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
        const params = new URLSearchParams(searchParams.toString());

        Object.entries(updates).forEach(([key, value]) => {
            if (value !== undefined && value !== '' && value !== 1 && !(key === 'limit' && value === 20)) {
                params.set(key, String(value));
            } else {
                params.delete(key);
            }
        });

        const query = params.toString();
        router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
    }, [searchParams, router, pathname]);

    const setPage = useCallback((newPage: number) => {
        updateURL({ page: newPage });
    }, [updateURL]);

    const setLimit = useCallback((newLimit: number) => {
        updateURL({ page: 1, limit: newLimit });
    }, [updateURL]);

    const setSort = useCallback((column: string) => {
        const newOrder = sortBy === column && sortOrder === 'ASC' ? 'DESC' : 'ASC';
        updateURL({ sortBy: column, sortOrder: newOrder, page: 1 });
    }, [updateURL, sortBy, sortOrder]);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/invoices?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
                { credentials: 'include' }
            );
            const data = await res.json();
            const invoicesList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
            setInvoices(invoicesList);
            setTotal(data.total || invoicesList.length || 0);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    }, [page, limit, sortBy, sortOrder]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
        switch (status?.toLowerCase()) {
            case 'success': return 'success';
            case 'pending': return 'warning';
            case 'error': return 'danger';
            default: return 'neutral';
        }
    };

    const getStatusLabel = (status: string): string => {
        switch (status?.toLowerCase()) {
            case 'success': return 'Başarılı';
            case 'pending': return 'Beklemede';
            case 'error': return 'Hata';
            default: return status;
        }
    };

    const columns = useMemo<DataTableColumn<Invoice>[]>(() => [
        {
            key: 'invoiceNumber',
            header: 'Fatura No',
            sortable: true
        },
        {
            key: 'edocNo',
            header: 'E-Belge No',
            render: (row) => (
                <span className="text-muted-foreground">{row.edocNo}</span>
            )
        },
        {
            key: 'customer',
            header: 'Müşteri',
            render: (row) => `${row.customerFirstName} ${row.customerLastName}`
        },
        {
            key: 'cardCode',
            header: 'Kart Kodu',
            render: (row) => (
                <span className="text-muted-foreground">{row.cardCode}</span>
            )
        },
        {
            key: 'totalAmount',
            header: 'Tutar',
            align: 'right',
            sortable: true,
            render: (row) => (
                <span className="font-medium">
                    {Number(row.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {row.currencyCode}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            render: (row) => (
                <div>
                    <Badge variant={getStatusVariant(row.status)}>
                        {getStatusLabel(row.status)}
                    </Badge>
                    {row.status?.toLowerCase() === 'error' && row.errorMessage && (
                        <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={row.errorMessage}>
                            {row.errorMessage}
                        </p>
                    )}
                </div>
            )
        },
        {
            key: 'createdAt',
            header: 'Tarih',
            sortable: true,
            render: (row) => (
                <span className="text-muted-foreground">
                    {new Date(row.createdAt).toLocaleDateString('tr-TR')}
                </span>
            )
        },
    ], []);

    const pagination = useMemo(() => ({
        page,
        limit,
        total,
        totalPages,
    }), [page, limit, total, totalPages]);

    const sortConfig = useMemo(() => ({
        sortBy,
        sortOrder,
    }), [sortBy, sortOrder]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Faturalar</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        E-fatura kayıtlarını görüntüleyin
                    </p>
                </div>
                <span className="text-sm text-muted-foreground">
                    Toplam: {total} fatura
                </span>
            </div>

            <DataTable
                columns={columns}
                data={invoices}
                keyExtractor={(item) => item.id}
                isLoading={loading}
                pagination={pagination}
                sortConfig={sortConfig}
                onPageChange={setPage}
                onLimitChange={setLimit}
                onSort={setSort}
                emptyMessage="Henüz fatura bulunmuyor"
            />
        </div>
    );
}

export function InvoicesClient() {
    return (
        <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="medium" /></div>}>
            <InvoicesContent />
        </Suspense>
    );
}
