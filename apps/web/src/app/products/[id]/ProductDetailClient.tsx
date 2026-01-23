'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/components/ui/use-toast';
import {
    Loader2,
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Package,
    Store,
    CheckCircle2,
    XCircle,
    Info,
} from 'lucide-react';
import {
    getProduct,
    getStores,
    getProductStores,
    createProductStore,
    updateProductStore,
    deleteProductStore,
    Product,
    ProductStore,
    Store as ApiStore,
} from '@/lib/api';

interface Props {
    productId: string;
}

export function ProductDetailClient({ productId }: Props) {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<Product | null>(null);
    const [productStores, setProductStores] = useState<ProductStore[]>([]);
    const [stores, setStores] = useState<ApiStore[]>([]);

    // Store modal
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState<ProductStore | null>(null);
    const [saving, setSaving] = useState(false);

    const [storeForm, setStoreForm] = useState({
        storeId: '',
        storeSku: '',
        storeSalePrice: '',
        isActive: true,
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [productRes, storesRes, productStoresRes] = await Promise.all([
                getProduct(productId),
                getStores(1, 100),
                getProductStores(productId),
            ]);

            setProduct(productRes.data);
            setStores(storesRes.data || []);
            setProductStores(productStoresRes || []);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message || 'Veri yüklenemedi' });
        } finally {
            setLoading(false);
        }
    }, [productId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddStore = () => {
        setEditingStore(null);
        setStoreForm({
            storeId: '',
            storeSku: '',
            storeSalePrice: '',
            isActive: true,
        });
        setIsStoreModalOpen(true);
    };

    const handleEditStore = (ps: ProductStore) => {
        setEditingStore(ps);
        setStoreForm({
            storeId: ps.storeId,
            storeSku: ps.storeSku || '',
            storeSalePrice: ps.storeSalePrice?.toString() || '',
            isActive: ps.isActive,
        });
        setIsStoreModalOpen(true);
    };

    const handleSaveStore = async () => {
        setSaving(true);
        try {
            if (editingStore) {
                await updateProductStore(editingStore.id, {
                    storeSku: storeForm.storeSku || undefined,
                    storeSalePrice: storeForm.storeSalePrice ? parseFloat(storeForm.storeSalePrice) : undefined,
                    isActive: storeForm.isActive,
                });
                toast({ title: 'Başarılı', description: 'Mağaza bağlantısı güncellendi', variant: 'success' });
            } else {
                await createProductStore({
                    productId,
                    storeId: storeForm.storeId,
                    storeSku: storeForm.storeSku || undefined,
                    storeSalePrice: storeForm.storeSalePrice ? parseFloat(storeForm.storeSalePrice) : undefined,
                    stockQuantity: 0,
                    isActive: storeForm.isActive,
                });
                toast({ title: 'Başarılı', description: 'Mağaza bağlantısı oluşturuldu', variant: 'success' });
            }
            setIsStoreModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStore = async (id: string) => {
        if (!confirm('Bu mağaza bağlantısını silmek istediğinize emin misiniz?')) return;
        try {
            await deleteProductStore(id);
            toast({ title: 'Başarılı', description: 'Mağaza bağlantısı silindi', variant: 'success' });
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        }
    };

    const getStoreName = (storeId: string) => {
        return stores.find(s => s.id === storeId)?.name || storeId;
    };

    const connectedStoreIds = productStores.map(ps => ps.storeId);
    const availableStores = stores.filter(s => !connectedStoreIds.includes(s.id) || editingStore?.storeId === s.id);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-muted-foreground">Ürün bulunamadı</p>
                <Button onClick={() => router.push('/products')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Geri Dön
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/products">Ürünler</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{product.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <Button variant="outline" onClick={() => router.push('/products')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Geri
                </Button>
            </div>

            {/* Product Info Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Package className="w-8 h-8 text-primary" />
                            <div>
                                <CardTitle className="text-xl">{product.name}</CardTitle>
                                <CardDescription>
                                    {product.sku && <span className="font-mono">{product.sku}</span>}
                                    {product.barcode && <span className="ml-2 text-muted-foreground">| {product.barcode}</span>}
                                </CardDescription>
                            </div>
                        </div>
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                            {product.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Marka</p>
                            <p className="font-medium">{product.brand?.name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Kategori</p>
                            <p className="font-medium">{product.category?.name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Alış Fiyatı</p>
                            <p className="font-medium text-red-600">{product.purchasePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Satış Fiyatı</p>
                            <p className="font-medium text-green-600">{product.salePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="stores" className="w-full">
                <TabsList>
                    <TabsTrigger value="stores" className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Mağazalar
                    </TabsTrigger>
                    <TabsTrigger value="info" className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Detaylar
                    </TabsTrigger>
                </TabsList>

                {/* Stores Tab */}
                <TabsContent value="stores">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Mağaza Bağlantıları</CardTitle>
                                <CardDescription>
                                    Bu ürünün bağlı olduğu mağazaları yönetin
                                </CardDescription>
                            </div>
                            <Button onClick={handleAddStore} disabled={availableStores.length === 0}>
                                <Plus className="w-4 h-4 mr-2" />
                                Mağaza Ekle
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {productStores.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Henüz bağlı mağaza yok</p>
                                    <p className="text-sm mt-2">Ürünü satışa sunmak için bir mağazaya ekleyin.</p>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Mağaza</TableHead>
                                                <TableHead>Mağaza SKU</TableHead>
                                                <TableHead className="text-right">Mağaza Fiyatı</TableHead>
                                                <TableHead className="text-right">Stok</TableHead>
                                                <TableHead className="text-right">Satılabilir</TableHead>
                                                <TableHead className="text-right">Committed</TableHead>
                                                <TableHead className="text-center">Durum</TableHead>
                                                <TableHead className="text-right">İşlemler</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productStores.map((ps) => (
                                                <TableRow key={ps.id}>
                                                    <TableCell className="font-medium">{getStoreName(ps.storeId)}</TableCell>
                                                    <TableCell className="font-mono text-sm">{ps.storeSku || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        {ps.storeSalePrice !== null
                                                            ? `${ps.storeSalePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                                                            : <span className="text-muted-foreground">Ürün fiyatı</span>
                                                        }
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{ps.stockQuantity}</TableCell>
                                                    <TableCell className="text-right text-green-600">{ps.sellableQuantity}</TableCell>
                                                    <TableCell className="text-right text-orange-600">{ps.committedQuantity}</TableCell>
                                                    <TableCell className="text-center">
                                                        {ps.isActive ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEditStore(ps)}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteStore(ps.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Info Tab */}
                <TabsContent value="info">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ürün Detayları</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Ürün Adı</p>
                                    <p className="font-medium">{product.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">SKU</p>
                                    <p className="font-medium font-mono">{product.sku || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Barkod</p>
                                    <p className="font-medium font-mono">{product.barcode || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Marka</p>
                                    <p className="font-medium">{product.brand?.name || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Kategori</p>
                                    <p className="font-medium">{product.category?.name || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">KDV Oranı</p>
                                    <p className="font-medium">%{product.vatRate}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Desi</p>
                                    <p className="font-medium">{product.desi || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Alış Fiyatı</p>
                                    <p className="font-medium text-red-600">{product.purchasePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Satış Fiyatı</p>
                                    <p className="font-medium text-green-600">{product.salePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Toplam Stok</p>
                                    <p className="font-medium">{product.totalStockQuantity}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Satılabilir Stok</p>
                                    <p className="font-medium text-green-600">{product.totalSellableQuantity}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Mağaza Sayısı</p>
                                    <p className="font-medium">{product.storeCount}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Store Modal */}
            <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingStore ? 'Mağaza Bağlantısını Düzenle' : 'Mağaza Ekle'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingStore ? getStoreName(editingStore.storeId) : 'Ürünü bir mağazaya bağlayın'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {!editingStore && (
                            <div className="space-y-2">
                                <Label>Mağaza</Label>
                                <Select
                                    value={storeForm.storeId}
                                    onValueChange={(v) => setStoreForm(prev => ({ ...prev, storeId: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Mağaza seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableStores.map(store => (
                                            <SelectItem key={store.id} value={store.id}>
                                                {store.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Mağaza SKU (opsiyonel)</Label>
                            <Input
                                placeholder="Mağazaya özel SKU"
                                value={storeForm.storeSku}
                                onChange={(e) => setStoreForm(prev => ({ ...prev, storeSku: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Mağaza Fiyatı (₺) (opsiyonel)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="Boş bırakılırsa ürün fiyatı kullanılır"
                                value={storeForm.storeSalePrice}
                                onChange={(e) => setStoreForm(prev => ({ ...prev, storeSalePrice: e.target.value }))}
                            />
                            <p className="text-xs text-muted-foreground">
                                Bu mağaza için farklı bir fiyat belirleyebilirsiniz. Boş bırakılırsa ürün fiyatı ({product.salePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺) kullanılır.
                            </p>
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label>Aktif</Label>
                                <p className="text-sm text-muted-foreground">
                                    Bu bağlantı aktif mi?
                                </p>
                            </div>
                            <Switch
                                checked={storeForm.isActive}
                                onCheckedChange={(c) => setStoreForm(prev => ({ ...prev, isActive: c }))}
                            />
                        </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsStoreModalOpen(false)}>
                            İptal
                        </Button>
                        <Button
                            onClick={handleSaveStore}
                            disabled={saving || (!editingStore && !storeForm.storeId)}
                        >
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Kaydet
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
