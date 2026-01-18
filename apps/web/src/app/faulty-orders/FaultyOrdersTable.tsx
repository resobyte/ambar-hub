'use client';

import { useState, useEffect } from 'react';
import { DataTable, DataTableColumn } from '@/components/ui';
import { getFaultyOrders, deleteFaultyOrder, FaultyOrder } from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import { Button } from '@/components/ui';

export function FaultyOrdersTable() {
    const [faultyOrders, setFaultyOrders] = useState<FaultyOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const { success, error } = useToast();

    const fetchFaultyOrders = async () => {
        setLoading(true);
        try {
            const response = await getFaultyOrders(page, 10);
            setFaultyOrders(response.data);
            setTotal(response.meta.total);
        } catch (err) {
            error('Hatalı siparişler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFaultyOrders();
    }, [page]);

    const handleDelete = async (id: string) => {
        try {
            await deleteFaultyOrder(id);
            success('Hatalı sipariş silindi');
            fetchFaultyOrders();
        } catch (err) {
            error('Silme işlemi başarısız');
        }
    };

    const columns: DataTableColumn<FaultyOrder>[] = [
        { key: 'orderNumber', header: 'Sipariş No' },
        { key: 'customerName', header: 'Müşteri' },
        {
            key: 'missingBarcodes',
            header: 'Eksik Ürünler',
            render: (row) => (
                <div className="flex flex-wrap gap-1">
                    {row.missingBarcodes.slice(0, 3).map((bc, i) => (
                        <span key={i} className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs rounded">
                            {bc}
                        </span>
                    ))}
                    {row.missingBarcodes.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{row.missingBarcodes.length - 3} more</span>
                    )}
                </div>
            ),
        },
        {
            key: 'totalPrice',
            header: 'Tutar',
            render: (row) => `${Number(row.totalPrice || 0).toFixed(2)} ${row.currencyCode || 'TRY'}`,
        },
        {
            key: 'retryCount',
            header: 'Deneme',
            render: (row) => <span className="text-muted-foreground">{row.retryCount}</span>,
        },
        {
            key: 'integration',
            header: 'Entegrasyon',
            render: (row) => row.integration?.name || '-',
        },
        {
            key: 'createdAt',
            header: 'Tarih',
            render: (row) => new Date(row.createdAt).toLocaleDateString('tr-TR'),
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            shrink: true,
            render: (row) => (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                    Sil
                </Button>
            ),
        },
    ];

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-foreground">Hatalı Siparişler</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Ürün eşleşmesi yapılamayan siparişler. Eksik ürünleri ekledikten sonra sync yaparak çözebilirsiniz.
                </p>
            </div>

            <DataTable
                columns={columns}
                data={faultyOrders}
                keyExtractor={(item) => item.id}
                isLoading={loading}
                pagination={{
                    page,
                    limit: 10,
                    total,
                    totalPages: Math.ceil(total / 10),
                }}
                onPageChange={setPage}
                emptyMessage="Hatalı sipariş bulunmuyor."
            />
        </div>
    );
}
