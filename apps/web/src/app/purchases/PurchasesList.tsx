'use client';

import { useState, useEffect } from 'react';
import { Table, Column } from '@/components/common/Table';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/components/common/ToastContext';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Product {
    id: string;
    name: string;
    barcode: string;
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
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Taslak', color: 'bg-gray-100 text-gray-800' },
    ORDERED: { label: 'Sipariş Verildi', color: 'bg-blue-100 text-blue-800' },
    PARTIAL: { label: 'Kısmi Kabul', color: 'bg-yellow-100 text-yellow-800' },
    COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
    CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-800' },
};

export function PurchasesList() {
    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { success, error } = useToast();

    const [formData, setFormData] = useState({
        supplierId: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDate: '',
        notes: '',
        items: [{ productId: '', orderedQuantity: 1, unitPrice: 0 }],
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [poRes, supRes, prodRes] = await Promise.all([
                fetch(`${API_URL}/purchases?page=${page}&limit=10`, { credentials: 'include' }),
                fetch(`${API_URL}/suppliers?page=1&limit=100`, { credentials: 'include' }),
                fetch(`${API_URL}/products?page=1&limit=500`, { credentials: 'include' }),
            ]);
            const poData = await poRes.json();
            const supData = await supRes.json();
            const prodData = await prodRes.json();
            setPurchases(poData.data || []);
            setTotal(poData.meta?.total || 0);
            setSuppliers(supData.data || []);
            setProducts(prodData.data || []);
        } catch (err) {
            error('Veriler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [page]);

    const handleCreate = () => {
        setFormData({
            supplierId: suppliers[0]?.id || '',
            orderDate: new Date().toISOString().split('T')[0],
            expectedDate: '',
            notes: '',
            items: [{ productId: products[0]?.id || '', orderedQuantity: 1, unitPrice: 0 }],
        });
        setIsModalOpen(true);
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { productId: products[0]?.id || '', orderedQuantity: 1, unitPrice: 0 }],
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
            success('Satın alma oluşturuldu');
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            error('İşlem başarısız');
        }
    };

    const columns: Column<PurchaseOrder>[] = [
        { key: 'orderNumber', header: 'Sipariş No' },
        { key: 'supplier', header: 'Tedarikçi', render: (row) => row.supplier?.name || '-' },
        {
            key: 'status',
            header: 'Durum',
            render: (row) => {
                const status = STATUS_MAP[row.status] || { label: row.status, color: 'bg-gray-100' };
                return <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>{status.label}</span>;
            },
        },
        {
            key: 'totalAmount',
            header: 'Toplam',
            render: (row) => `${Number(row.totalAmount || 0).toFixed(2)} ₺`,
        },
        {
            key: 'orderDate',
            header: 'Sipariş Tarihi',
            render: (row) => new Date(row.orderDate).toLocaleDateString('tr-TR'),
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            shrink: true,
            render: (row) => (
                <Link href={`/purchases/${row.id}`}>
                    <Button variant="ghost" size="sm">Detay</Button>
                </Link>
            ),
        },
    ];

    const totalAmount = formData.items.reduce((sum, item) => sum + item.orderedQuantity * item.unitPrice, 0);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">Satın Alma</h2>
                    <p className="text-sm text-muted-foreground">Satın alma siparişlerini yönetin</p>
                </div>
                <Button onClick={handleCreate}>+ Yeni Satın Alma</Button>
            </div>

            <Table
                columns={columns}
                data={purchases}
                keyExtractor={(item) => item.id}
                isLoading={loading}
                pagination={{ page, limit: 10, total, totalPages: Math.ceil(total / 10) }}
                onPageChange={setPage}
                emptyMessage="Henüz satın alma kaydı yok"
            />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Yeni Satın Alma" size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Tedarikçi"
                            value={formData.supplierId}
                            onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                            required
                        />
                        <Input label="Sipariş Tarihi" type="date" value={formData.orderDate} onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })} required />
                    </div>
                    <Input label="Beklenen Tarih" type="date" value={formData.expectedDate} onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })} />

                    <div className="border-t pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium">Ürünler</h3>
                            <Button type="button" size="sm" variant="outline" onClick={addItem}>+ Ürün Ekle</Button>
                        </div>
                        <div className="space-y-2">
                            {formData.items.map((item, index) => (
                                <div key={index} className="flex gap-2 items-end">
                                    <Select
                                        label={index === 0 ? 'Ürün' : undefined}
                                        value={item.productId}
                                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                                        options={products.map(p => ({ value: p.id, label: `${p.name} [${p.barcode}]` }))}
                                        className="flex-1"
                                    />
                                    <Input
                                        label={index === 0 ? 'Adet' : undefined}
                                        type="number"
                                        value={item.orderedQuantity}
                                        onChange={(e) => updateItem(index, 'orderedQuantity', parseInt(e.target.value) || 0)}
                                        className="w-20"
                                    />
                                    <Input
                                        label={index === 0 ? 'Birim Fiyat' : undefined}
                                        type="number"
                                        step="0.01"
                                        value={item.unitPrice}
                                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                        className="w-28"
                                    />
                                    {formData.items.length > 1 && (
                                        <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>×</Button>
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
            </Modal>
        </div>
    );
}
