'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Package, History, AlertCircle } from 'lucide-react';

const isServer = typeof window === 'undefined';
const API_URL = isServer
    ? (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
    : '/api';

interface Product {
    id: string;
    name: string;
    barcode: string;
}

interface Consumable {
    id: string;
    name: string;
    sku: string;
    unit: string;
}

interface PurchaseOrderItem {
    id: string;
    productId?: string;
    consumableId?: string;
    orderedQuantity: number;
    receivedQuantity: number;
    unitPrice: number;
    product?: Product;
    consumable?: Consumable;
}

interface Shelf {
    id: string;
    name: string;
    barcode: string;
    type: string;
}

interface GoodsReceiptItem {
    productId?: string;
    consumableId?: string;
    product?: Product;
    consumable?: Consumable;
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

export function PurchaseDetailClient({ id }: { id: string }) {
    const [purchase, setPurchase] = useState<PurchaseOrder | null>(null);
    const [receivingShelves, setReceivingShelves] = useState<Shelf[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const { toast } = useToast();

    const [receiveItems, setReceiveItems] = useState<{ productId?: string; consumableId?: string; shelfId: string; quantity: number; unitCost: number }[]>([]);

    const fetchPurchase = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/purchases/${id}`, { credentials: 'include' });
            const json = await res.json();
            if (json.success) {
                setPurchase(json.data);
            }
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Sipariş yüklenemedi' });
        } finally {
            setLoading(false);
        }
    };

    const fetchReceivingShelves = async () => {
        try {
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
        const items = (purchase.items || [])
            .filter(item => item.orderedQuantity > item.receivedQuantity)
            .map(item => ({
                productId: item.productId,
                consumableId: item.consumableId,
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
            toast({ title: 'Başarılı', description: 'Mal kabul başarılı', variant: 'success' });
            setIsReceiveModalOpen(false);
            fetchPurchase();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Mal kabul başarısız' });
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
            toast({ title: 'Başarılı', description: 'Mal kabul geri alındı', variant: 'success' });
            fetchPurchase();
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'İşlem başarısız' });
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!purchase) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold">Sipariş Bulunamadı</h2>
                <Button variant="outline" asChild>
                    <Link href="/purchases">Listeye Dön</Link>
                </Button>
            </div>
        );
    }

    const status = STATUS_MAP[purchase.status] || { label: purchase.status, color: 'bg-gray-100' };
    const hasRemainingItems = (purchase.items || []).some(item => item.orderedQuantity > item.receivedQuantity);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/purchases">Satın Alma</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{purchase.orderNumber}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            {purchase.orderNumber}
                            <Badge variant="outline" className={status.color}>{status.label}</Badge>
                        </h2>
                        <p className="text-muted-foreground mt-1 text-lg">{purchase.supplier?.name}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href="/purchases">
                                <ArrowLeft className="w-4 h-4 mr-2" /> Geri
                            </Link>
                        </Button>
                        {hasRemainingItems && purchase.status !== 'COMPLETED' && (
                            <Button onClick={openReceiveModal}>
                                <Package className="w-4 h-4 mr-2" /> Mal Kabul
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Tutar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Number(purchase.totalAmount).toFixed(2)} ₺</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Sipariş Tarihi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{new Date(purchase.orderDate).toLocaleDateString('tr-TR')}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Beklenen Tarih</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {purchase.expectedDate ? new Date(purchase.expectedDate).toLocaleDateString('tr-TR') : '-'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Sipariş Kalemleri</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ürün</TableHead>
                                <TableHead className="text-right">Sipariş</TableHead>
                                <TableHead className="text-right">Alınan</TableHead>
                                <TableHead className="text-right">Kalan</TableHead>
                                <TableHead className="text-right">Birim Fiyat</TableHead>
                                <TableHead className="text-right">Tutar</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(purchase.items || []).map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {item.product?.name || item.consumable?.name || (item.product ? 'Ürün Adı Yok' : item.consumable ? 'Sarf Malzeme Adı Yok' : 'Bilinmeyen Kalem')}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            {item.product?.barcode || item.consumable?.sku || item.productId || item.consumableId || '-'}
                                            {item.consumable && <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1 py-0 border-orange-200 text-orange-700 bg-orange-50">Sarf</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {item.orderedQuantity} {item.consumable?.unit === 'METER' ? 'm' : 'ad'}
                                    </TableCell>
                                    <TableCell className="text-right">{item.receivedQuantity}</TableCell>
                                    <TableCell className="text-right">
                                        <span className={item.orderedQuantity - item.receivedQuantity > 0 ? 'text-amber-600 font-bold' : 'text-green-600 font-bold'}>
                                            {item.orderedQuantity - item.receivedQuantity}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">{Number(item.unitPrice).toFixed(2)} ₺</TableCell>
                                    <TableCell className="text-right font-medium">
                                        {(item.orderedQuantity * item.unitPrice).toFixed(2)} ₺
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {purchase.goodsReceipts?.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5" />
                            <CardTitle>Mal Kabul Geçmişi</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {purchase.goodsReceipts.map(receipt => (
                            <div key={receipt.id} className="border rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="font-semibold text-lg">{receipt.receiptNumber}</span>
                                        <Badge variant={receipt.status === 'COMPLETED' ? 'default' : 'destructive'}>
                                            {receipt.status === 'COMPLETED' ? 'Tamamlandı' : 'Geri Alındı'}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            {new Date(receipt.receiptDate).toLocaleDateString('tr-TR')}
                                        </span>
                                    </div>
                                    {receipt.status === 'COMPLETED' && (
                                        <Button variant="ghost" size="sm" onClick={() => handleReverseReceipt(receipt.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                            İşlemi Geri Al
                                        </Button>
                                    )}
                                </div>
                                <div className="bg-muted/50 rounded-md p-3 text-sm">
                                    <div className="font-medium mb-2">Kabul Edilen Ürünler:</div>
                                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                        {receipt.items?.map((item, i) => (
                                            <li key={i}>
                                                <span className="text-foreground font-medium">{item.product?.name || item.consumable?.name || item.productId || item.consumableId}</span>
                                                <span className="mx-2">-</span>
                                                {item.quantity} {item.consumable?.unit === 'METER' ? 'metre' : 'adet'}
                                                {item.shelf && <span className="ml-2 text-xs bg-background border px-1.5 py-0.5 rounded">Raf: {item.shelf.name}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Mal Kabul</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm mb-4 border border-blue-100">
                            <p>Ürünleri mal kabul rafına yerleştirin. Sistem otomatik olarak stok ekleyecektir.</p>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {receiveItems.map((item, index) => {
                                const poItem = purchase.items.find(i =>
                                    (item.productId && i.productId === item.productId) ||
                                    (item.consumableId && i.consumableId === item.consumableId)
                                );
                                return (
                                    <div key={index} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 border rounded-lg bg-card">
                                        <div className="flex-1">
                                            <div className="font-medium text-base">{poItem?.product?.name || poItem?.consumable?.name}</div>
                                            <div className="text-sm text-muted-foreground flex gap-2 mt-1">
                                                <Badge variant="outline">{poItem?.product?.barcode || poItem?.consumable?.sku}</Badge>
                                                <span>Kalan: {item.quantity} {poItem?.consumable?.unit === 'METER' ? 'm' : 'ad'}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 w-full sm:w-auto">
                                            <div className="space-y-1.5 flex-1 sm:flex-none">
                                                <Label className="text-xs">Raf</Label>
                                                <Select
                                                    value={item.shelfId}
                                                    onValueChange={(v) => updateReceiveItem(index, 'shelfId', v)}
                                                >
                                                    <SelectTrigger className="w-full sm:w-48">
                                                        <SelectValue placeholder="Raf seç" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {receivingShelves.map(s => (
                                                            <SelectItem key={s.id} value={s.id}>{s.name} [{s.barcode}]</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5 w-24">
                                                <Label className="text-xs">Miktar</Label>
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateReceiveItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReceiveModalOpen(false)}>İptal</Button>
                        <Button onClick={handleReceive}>Mal Kabul Et</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
