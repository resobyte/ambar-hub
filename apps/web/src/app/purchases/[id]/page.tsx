'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select } from '@/components/ui';
import { Modal } from '@/components/ui';
import { useToast } from '@/components/common/ToastContext';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Product {
    id: string;
    name: string;
    barcode: string;
}

interface PurchaseOrderItem {
    id: string;
    productId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitPrice: number;
    product: Product;
}

interface Shelf {
    id: string;
    name: string;
    barcode: string;
    type: string;
}

interface GoodsReceiptItem {
    productId: string;
    product?: Product;
    quantity: number;
    shelf?: Shelf;
}

interface GoodsReceipt {
    id: string;
    receiptNumber: string;
    status: string;
    receiptDate: string;
    items: GoodsReceiptItem[];
}

interface PurchaseOrder {
    id: string;
    orderNumber: string;
    supplier: { id: string; name: string };
    status: string;
    totalAmount: number;
    orderDate: string;
    expectedDate?: string;
    notes?: string;
    items: PurchaseOrderItem[];
    goodsReceipts: GoodsReceipt[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Taslak', color: 'bg-gray-100 text-gray-800' },
    ORDERED: { label: 'Sipariş Verildi', color: 'bg-blue-100 text-blue-800' },
    PARTIAL: { label: 'Kısmi Kabul', color: 'bg-yellow-100 text-yellow-800' },
    COMPLETED: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800' },
    CANCELLED: { label: 'İptal', color: 'bg-red-100 text-red-800' },
};

export default function PurchaseDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;
    const [purchase, setPurchase] = useState<PurchaseOrder | null>(null);
    const [receivingShelves, setReceivingShelves] = useState<Shelf[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const { success, error } = useToast();

    const [receiveItems, setReceiveItems] = useState<{ productId: string; shelfId: string; quantity: number; unitCost: number }[]>([]);

    const fetchPurchase = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/purchases/${id}`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setPurchase(json.data);
            }
        } catch (err) {
            error('Sipariş yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const fetchReceivingShelves = async () => {
        try {
            // Get all shelves with type RECEIVING (we'll need a warehouse id, but for now get all)
            const res = await fetch(`${API_URL}/shelves?type=RECEIVING`, { credentials: 'include' });
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setReceivingShelves(json.data);
            }
        } catch (err) {
            console.error('Failed to load shelves');
        }
    };

    useEffect(() => {
        fetchPurchase();
        fetchReceivingShelves();
    }, [id]);

    const openReceiveModal = () => {
        if (!purchase) return;
        // Initialize receive items with remaining quantities
        const items = (purchase.items || [])
            .filter(item => item.orderedQuantity > item.receivedQuantity)
            .map(item => ({
                productId: item.productId,
                shelfId: receivingShelves[0]?.id || '',
                quantity: item.orderedQuantity - item.receivedQuantity,
                unitCost: item.unitPrice,
            }));
        setReceiveItems(items);
        setIsReceiveModalOpen(true);
    };

    const updateReceiveItem = (index: number, field: string, value: any) => {
        const items = [...receiveItems];
        (items[index] as any)[field] = value;
        setReceiveItems(items);
    };

    const handleReceive = async () => {
        try {
            const res = await fetch(`${API_URL}/purchases/${id}/receive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ items: receiveItems }),
            });

            if (!res.ok) throw new Error('Failed');
            success('Mal kabul başarılı');
            setIsReceiveModalOpen(false);
            fetchPurchase();
        } catch (err) {
            error('Mal kabul başarısız');
        }
    };

    const handleReverseReceipt = async (receiptId: string) => {
        if (!confirm('Bu mal kabulü geri almak istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`${API_URL}/purchases/receipts/${receiptId}/reverse`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!res.ok) throw new Error('Failed');
            success('Mal kabul geri alındı');
            fetchPurchase();
        } catch (err) {
            error('İşlem başarısız');
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-muted-foreground">Yükleniyor...</div>;
    }

    if (!purchase) {
        return <div className="p-6 text-center text-muted-foreground">Sipariş bulunamadı</div>;
    }

    const status = STATUS_MAP[purchase.status] || { label: purchase.status, color: 'bg-gray-100' };
    const hasRemainingItems = (purchase.items || []).some(item => item.orderedQuantity > item.receivedQuantity);

    return (
        <div className="p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <Link href="/purchases" className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block">
                        ← Satın Alma Listesi
                    </Link>
                    <h2 className="text-2xl font-semibold text-foreground">{purchase.orderNumber}</h2>
                    <p className="text-muted-foreground">{purchase.supplier?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${status.color}`}>{status.label}</span>
                    {hasRemainingItems && purchase.status !== 'COMPLETED' && (
                        <Button onClick={openReceiveModal}>Mal Kabul</Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-card p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground">Toplam Tutar</div>
                    <div className="text-xl font-semibold">{Number(purchase.totalAmount).toFixed(2)} ₺</div>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground">Sipariş Tarihi</div>
                    <div className="text-xl font-semibold">{new Date(purchase.orderDate).toLocaleDateString('tr-TR')}</div>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground">Beklenen Tarih</div>
                    <div className="text-xl font-semibold">{purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString('tr-TR') : '-'}</div>
                </div>
            </div>

            {/* Order Items */}
            <div className="bg-card rounded-lg border border-border mb-6">
                <div className="p-4 border-b border-border">
                    <h3 className="font-semibold">Sipariş Kalemleri</h3>
                </div>
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border text-left text-sm text-muted-foreground">
                            <th className="p-3">Ürün</th>
                            <th className="p-3 text-right">Sipariş</th>
                            <th className="p-3 text-right">Alınan</th>
                            <th className="p-3 text-right">Kalan</th>
                            <th className="p-3 text-right">Birim Fiyat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(purchase.items || []).map(item => (
                            <tr key={item.id} className="border-b border-border last:border-0">
                                <td className="p-3">
                                    <div className="font-medium">{item.product?.name}</div>
                                    <div className="text-sm text-muted-foreground">{item.product?.barcode}</div>
                                </td>
                                <td className="p-3 text-right">{item.orderedQuantity}</td>
                                <td className="p-3 text-right">{item.receivedQuantity}</td>
                                <td className="p-3 text-right">
                                    <span className={item.orderedQuantity - item.receivedQuantity > 0 ? 'text-amber-600 font-medium' : 'text-green-600'}>
                                        {item.orderedQuantity - item.receivedQuantity}
                                    </span>
                                </td>
                                <td className="p-3 text-right">{Number(item.unitPrice).toFixed(2)} ₺</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Goods Receipts History */}
            {purchase.goodsReceipts?.length > 0 && (
                <div className="bg-card rounded-lg border border-border">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold">Mal Kabul Geçmişi</h3>
                    </div>
                    <div className="divide-y divide-border">
                        {purchase.goodsReceipts.map(receipt => (
                            <div key={receipt.id} className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div>
                                        <span className="font-medium">{receipt.receiptNumber}</span>
                                        <span className="text-muted-foreground ml-2">
                                            {new Date(receipt.receiptDate).toLocaleDateString('tr-TR')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${receipt.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                            receipt.status === 'REVERSED' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            {receipt.status === 'COMPLETED' ? 'Tamamlandı' : receipt.status === 'REVERSED' ? 'Geri Alındı' : receipt.status}
                                        </span>
                                        {receipt.status === 'COMPLETED' && (
                                            <Button variant="ghost" size="sm" onClick={() => handleReverseReceipt(receipt.id)}>
                                                Geri Al
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    {receipt.items?.map((item, i) => (
                                        <span key={i}>
                                            {item.product?.name || item.productId}: {item.quantity} adet
                                            {i < receipt.items.length - 1 && ', '}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Receive Modal */}
            <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title="Mal Kabul" size="lg">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Ürünleri mal kabul rafına yerleştirin. Sistem otomatik olarak stok ekleyecektir.
                    </p>

                    <div className="space-y-3">
                        {receiveItems.map((item, index) => {
                            const poItem = purchase.items.find(i => i.productId === item.productId);
                            return (
                                <div key={index} className="flex gap-3 items-center p-3 bg-muted/30 rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-medium">{poItem?.product?.name}</div>
                                        <div className="text-sm text-muted-foreground">{poItem?.product?.barcode}</div>
                                    </div>
                                    <Select
                                        value={item.shelfId}
                                        onChange={(e) => updateReceiveItem(index, 'shelfId', e.target.value)}
                                        options={receivingShelves.map(s => ({ value: s.id, label: `${s.name} [${s.barcode}]` }))}
                                        className="w-48"
                                    />
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateReceiveItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                        className="w-20"
                                    />
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsReceiveModalOpen(false)}>İptal</Button>
                        <Button onClick={handleReceive}>Mal Kabul Et</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
