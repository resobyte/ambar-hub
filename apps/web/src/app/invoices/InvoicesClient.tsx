'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { apiGetPaginated } from '@/lib/api';

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
    responsePayload?: any;
    requestPayload?: any;
}

export function InvoicesClient() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [viewPayload, setViewPayload] = useState<{ title: string; content: any } | null>(null);
    const limit = 20;

    useEffect(() => {
        fetchInvoices();
    }, [page]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await apiGetPaginated<Invoice>('/invoices', {
                params: { page, limit }
            });

            // apiGetPaginated returns { success: boolean, data: Invoice[], meta: ... }
            if (res.success && Array.isArray(res.data)) {
                setInvoices(res.data);
                setTotal(res.meta?.total || res.data.length || 0);
            } else {
                setInvoices([]);
                setTotal(0);
            }

        } catch (error) {
            console.error('Error fetching invoices:', error);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const normalizedStatus = status?.toLowerCase() || '';
        const styles: Record<string, string> = {
            'success': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'error': 'bg-red-100 text-red-800',
        };
        const labels: Record<string, string> = {
            'success': 'Başarılı',
            'pending': 'Beklemede',
            'error': 'Hata',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[normalizedStatus] || 'bg-gray-100 text-gray-800'}`}>
                {labels[normalizedStatus] || status}
            </span>
        );
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Faturalar</h1>
                <span className="text-sm text-muted-foreground">
                    Toplam: {total} fatura
                </span>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : invoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    Henüz fatura bulunmuyor
                </div>
            ) : (
                <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Fatura No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        E-Belge No
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Müşteri
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Kart Kodu
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Tutar
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Durum
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Req. Payload
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Res. Payload
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Tarih
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-muted/30">
                                        <td className="px-4 py-3 text-sm font-medium">
                                            {invoice.invoiceNumber}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {invoice.edocNo}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {invoice.customerFirstName} {invoice.customerLastName}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {invoice.cardCode}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium">
                                            {Number(invoice.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currencyCode}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex flex-col gap-1 items-start">
                                                {getStatusBadge(invoice.status)}
                                                {invoice.status?.toLowerCase() === 'error' && (
                                                    <button
                                                        onClick={() => setViewPayload({ title: 'Hata Detayı', content: invoice.errorMessage })}
                                                        className="text-xs text-red-500 hover:underline text-left block"
                                                    >
                                                        Hata Detayı
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <button
                                                onClick={() => setViewPayload({ title: `Request Payload (${invoice.invoiceNumber})`, content: invoice.requestPayload })}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                            >
                                                Göster
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <button
                                                onClick={() => setViewPayload({ title: `Response Payload (${invoice.invoiceNumber})`, content: invoice.responsePayload })}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                            >
                                                Göster
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {new Date(invoice.createdAt).toLocaleDateString('tr-TR')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center px-4 py-3 border-t">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                            >
                                Önceki
                            </button>
                            <span className="text-sm text-muted-foreground">
                                Sayfa {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                            >
                                Sonraki
                            </button>
                        </div>
                    )}
                </div>
            )}

            <Modal
                isOpen={!!viewPayload}
                onClose={() => setViewPayload(null)}
                title={viewPayload?.title || 'Payload'}
                size="lg"
            >
                <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-[60vh] text-xs font-mono whitespace-pre-wrap break-all">
                        {typeof viewPayload?.content === 'string'
                            ? viewPayload.content
                            : JSON.stringify(viewPayload?.content || {}, null, 2)}
                    </pre>
                </div>
            </Modal>
        </div>
    );
}
