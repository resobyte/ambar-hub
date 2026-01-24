'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Combobox } from '@/components/ui/combobox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, X, Package, Archive } from 'lucide-react';
import { Consumable, getConsumables } from '@/lib/api';

const isServer = typeof window === 'undefined';
const API_URL = isServer
    ? (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
    : '/api';

interface Product {
    id: string;
    name: string;
    barcode: string;
    sku: string;
}

interface Supplier {
    id: string;
    name: string;
}

interface PurchaseFormItem {
    type: 'PRODUCT' | 'CONSUMABLE';
    productId?: string;
    consumableId?: string;
    productName: string;
    orderedQuantity: number;
    unitPrice: number;
}

interface PurchaseFormData {
    supplierId: string;
    orderDate: string;
    notes: string;
    type: string;
    invoiceNumber: string;
    items: PurchaseFormItem[];
}

export function CreatePurchaseClient() {
    const router = useRouter();
    const { toast } = useToast();

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [loading, setLoading] = useState(true);

    const [invoiceDocNo, setInvoiceDocNo] = useState('');
    const [importing, setImporting] = useState(false);

    const [formData, setFormData] = useState<PurchaseFormData>({
        supplierId: '',
        orderDate: new Date().toISOString().split('T')[0],
        notes: '',
        type: 'MANUAL',
        invoiceNumber: '',
        items: [
            {
                type: 'PRODUCT',
                productId: '',
                productName: '',
                orderedQuantity: 1,
                unitPrice: 0,
            },
        ],
    });

    const fetchLookups = useCallback(async () => {
        setLoading(true);
        try {
            const [supRes, prodRes, consRes] = await Promise.all([
                fetch(`${API_URL}/suppliers?page=1&limit=100`, { credentials: 'include' }),
                fetch(`${API_URL}/products?page=1&limit=100`, { credentials: 'include' }),
                getConsumables(),
            ]);

            const supData = await supRes.json();
            const prodData = await prodRes.json();

            setSuppliers(supData.data || []);
            setProducts(prodData.data || []);

            if (consRes.success) {
                setConsumables(consRes.data || []);
            }

            setFormData(prev => ({
                ...prev,
                supplierId: prev.supplierId || supData.data?.[0]?.id || '',
            }));
        } catch {
            toast({ variant: 'destructive', title: 'Hata', description: 'Tanımlar yüklenemedi' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchLookups();
    }, [fetchLookups]);

    const handleImportInvoice = async () => {
        if (!invoiceDocNo) return;
        setImporting(true);
        try {
            const res = await fetch(`${API_URL}/purchases/import-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ docNo: invoiceDocNo }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Fatura bulunamadı veya uygun değil');
            }

            const resData = await res.json();
            const data = resData.data || resData;

            setFormData({
                supplierId: data.supplierId || '',
                orderDate: data.orderDate
                    ? new Date(data.orderDate).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
                notes: `Fatura No: ${data.invoiceNumber}`,
                type: 'INVOICE',
                invoiceNumber: data.invoiceNumber,
                items: data.items.map((item: any) => {
                    const matchedProduct = products.find(
                        p =>
                            p.id === item.productId ||
                            (item.productCode && p.sku === item.productCode) ||
                            (item.productCode && p.barcode === item.productCode),
                    );

                    return {
                        type: 'PRODUCT',
                        productId: matchedProduct ? matchedProduct.id : (item.productId || ''),
                        productName: item.productName || '',
                        orderedQuantity: item.orderedQuantity,
                        unitPrice: item.unitPrice,
                    };
                }),
            });

            toast({
                title: 'Başarılı',
                description: 'Fatura bilgileri çekildi',
                variant: 'success',
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'İşlem başarısız';
            toast({ variant: 'destructive', title: 'Hata', description: message });
        } finally {
            setImporting(false);
        }
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    type: 'PRODUCT',
                    productId: '',
                    productName: '',
                    orderedQuantity: 1,
                    unitPrice: 0,
                },
            ],
        }));
    };

    const removeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index),
        }));
    };

    const updateItem = (index: number, field: keyof PurchaseFormItem, value: string | number | 'PRODUCT' | 'CONSUMABLE') => {
        setFormData(prev => {
            const items = [...prev.items];

            if (field === 'type') {
                const nextType = value as 'PRODUCT' | 'CONSUMABLE';
                items[index] = {
                    ...items[index],
                    type: nextType,
                    productId: undefined,
                    consumableId: undefined,
                    productName: '',
                };
            } else {
                (items[index] as any)[field] = value;
            }

            return { ...prev, items };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...formData,
            items: formData.items.map(item => {
                if (item.type === 'PRODUCT') {
                    return {
                        productId: item.productId,
                        orderedQuantity: item.orderedQuantity,
                        unitPrice: item.unitPrice,
                    };
                }
                return {
                    consumableId: item.consumableId,
                    orderedQuantity: item.orderedQuantity,
                    unitPrice: item.unitPrice,
                };
            }),
        };

        try {
            const res = await fetch(`${API_URL}/purchases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed');

            toast({
                title: 'Başarılı',
                description: 'Satın alma oluşturuldu',
                variant: 'success',
            });

            router.push('/purchases');
            router.refresh();
        } catch {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: 'İşlem başarısız',
            });
        }
    };

    const totalAmount = formData.items.reduce(
        (sum, item) => sum + item.orderedQuantity * item.unitPrice,
        0,
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
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
                            <BreadcrumbPage>Yeni Satın Alma</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/purchases')}>
                        <X className="w-4 h-4 mr-2" />
                        Vazgeç
                    </Button>
                    <Button onClick={handleSubmit}>
                        Kaydet
                    </Button>
                </div>
            </div>

            <Tabs
                defaultValue="MANUAL"
                value={formData.type}
                onValueChange={(v) => {
                    setFormData(prev => ({
                        ...prev,
                        type: v,
                        invoiceNumber: '',
                        notes: '',
                    }));
                }}
                className="space-y-4"
            >
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="MANUAL">Manuel Oluştur</TabsTrigger>
                    <TabsTrigger value="INVOICE">Faturadan Çek</TabsTrigger>
                </TabsList>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Genel Bilgiler</CardTitle>
                            <CardDescription>Tedarikçi ve tarih bilgilerini giriniz.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Tedarikçi</Label>
                                <Select
                                    value={formData.supplierId}
                                    onValueChange={v =>
                                        setFormData(prev => ({ ...prev, supplierId: v }))
                                    }
                                    disabled={loading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Tedarikçi seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Sipariş Tarihi</Label>
                                <Input
                                    type="date"
                                    value={formData.orderDate}
                                    onChange={e =>
                                        setFormData(prev => ({
                                            ...prev,
                                            orderDate: e.target.value,
                                        }))
                                    }
                                    required
                                />
                            </div>
                            {formData.type === 'INVOICE' && (
                                <div className="space-y-2">
                                    <Label>Notlar</Label>
                                    <Input
                                        value={formData.notes}
                                        onChange={e =>
                                            setFormData(prev => ({ ...prev, notes: e.target.value }))
                                        }
                                        placeholder="Fatura açıklaması veya not"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {formData.type === 'MANUAL' ? 'İşlem Detayları' : 'Fatura İçe Aktar'}
                            </CardTitle>
                            <CardDescription>
                                {formData.type === 'MANUAL'
                                    ? 'Ürünleri aşağıdan manuel olarak ekleyiniz.'
                                    : 'Uyumsoft üzerinden fatura sorgulayınız.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TabsContent value="MANUAL" className="mt-0">
                                <div className="rounded-lg border bg-muted/50 p-4">
                                    <p className="text-sm text-muted-foreground">
                                        Manuel modda ürünleri tablodan tek tek seçerek, miktar ve fiyat bilgilerini girebilirsiniz.
                                    </p>
                                </div>
                            </TabsContent>
                            <TabsContent value="INVOICE" className="mt-0 space-y-4">
                                <div className="space-y-2">
                                    <Label>Fatura Numarası</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Örn: FAT2024..."
                                            value={invoiceDocNo}
                                            onChange={e => setInvoiceDocNo(e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleImportInvoice}
                                            disabled={importing || !invoiceDocNo}
                                        >
                                            {importing ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                'Sorgula'
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        Sadece &quot;MALALIS&quot; türündeki faturalar desteklenir.
                                    </p>
                                </div>
                            </TabsContent>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle>Ürün Listesi</CardTitle>
                            <CardDescription>Siparişe eklenecek ürünler</CardDescription>
                        </div>
                        <Button onClick={addItem} size="sm" className="h-8">
                            <Plus className="w-4 h-4 mr-2" />
                            Satır Ekle
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[140px]">Tip</TableHead>
                                    <TableHead>Ürün / Malzeme</TableHead>
                                    <TableHead className="w-[120px]">Miktar</TableHead>
                                    <TableHead className="w-[140px]">Birim Fiyat</TableHead>
                                    <TableHead className="w-[100px] text-right">Tutar</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {formData.items.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <div className="flex items-center rounded-md border bg-muted p-1">
                                                <Button
                                                    type="button"
                                                    variant={item.type === 'PRODUCT' ? 'secondary' : 'ghost'}
                                                    size="sm"
                                                    className={`h-6 flex-1 px-2 text-[10px] ${item.type === 'PRODUCT'
                                                            ? 'bg-background shadow-sm text-primary font-medium'
                                                            : 'text-muted-foreground hover:bg-background/50'
                                                        }`}
                                                    onClick={() => updateItem(index, 'type', 'PRODUCT')}
                                                >
                                                    Ürün
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={item.type === 'CONSUMABLE' ? 'secondary' : 'ghost'}
                                                    size="sm"
                                                    className={`h-6 flex-1 px-2 text-[10px] ${item.type === 'CONSUMABLE'
                                                            ? 'bg-orange-50 text-orange-700 shadow-sm font-medium border-orange-100'
                                                            : 'text-muted-foreground hover:bg-background/50'
                                                        }`}
                                                    onClick={() => updateItem(index, 'type', 'CONSUMABLE')}
                                                >
                                                    Sarf
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {item.type === 'PRODUCT' ? (
                                                <Combobox
                                                    options={products.map(p => ({
                                                        value: p.id,
                                                        label: `${p.name} [${p.barcode || p.sku}]`,
                                                    }))}
                                                    value={item.productId}
                                                    onValueChange={v => updateItem(index, 'productId', v)}
                                                    placeholder="Ürün seçiniz..."
                                                    searchPlaceholder="Ürün ara..."
                                                    emptyMessage="Bulunamadı."
                                                    className="w-full"
                                                />
                                            ) : (
                                                <Combobox
                                                    options={consumables
                                                        .filter(c => !c.parentId)
                                                        .map(c => ({
                                                            value: c.id,
                                                            label: `${c.name} [${c.sku || c.barcode || c.type
                                                                }]`,
                                                        }))}
                                                    value={item.consumableId}
                                                    onValueChange={v =>
                                                        updateItem(index, 'consumableId', v)
                                                    }
                                                    placeholder="Sarf malzeme seçiniz..."
                                                    searchPlaceholder="Malzeme ara..."
                                                    emptyMessage="Bulunamadı."
                                                    className="w-full"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                className="h-8"
                                                value={item.orderedQuantity}
                                                onChange={e =>
                                                    updateItem(
                                                        index,
                                                        'orderedQuantity',
                                                        parseInt(e.target.value, 10) || 0,
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="h-8"
                                                value={item.unitPrice}
                                                onChange={e =>
                                                    updateItem(
                                                        index,
                                                        'unitPrice',
                                                        parseFloat(e.target.value) || 0,
                                                    )
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {(item.orderedQuantity * item.unitPrice).toFixed(2)} ₺
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => removeItem(index)}
                                                disabled={formData.items.length <= 1}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="flex justify-end pt-4">
                            <div className="flex items-center gap-4 rounded-lg bg-muted/50 px-4 py-2">
                                <span className="text-sm font-medium text-muted-foreground">Genel Toplam</span>
                                <span className="text-xl font-bold">{totalAmount.toFixed(2)} ₺</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Tabs>
        </div>
    );
}
