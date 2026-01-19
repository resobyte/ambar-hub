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
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Settings, Package, Store } from 'lucide-react';
import {
    getIntegration,
    getIntegrationStores,
    getStores,
    updateIntegration,
    createIntegrationStore,
    updateIntegrationStore,
    deleteIntegrationStore,
    getActiveShippingProviders,
    Integration,
    IntegrationStore,
    Store as StoreType,
    ShippingProvider,
} from '@/lib/api';

interface Props {
    integrationId: string;
}

const INTEGRATION_TYPE_LABELS: Record<string, string> = {
    TRENDYOL: 'Trendyol',
    HEPSIBURADA: 'Hepsiburada',
    IKAS: 'Ikas',
};

export function IntegrationDetail({ integrationId }: Props) {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [integration, setIntegration] = useState<Integration | null>(null);
    const [integrationStores, setIntegrationStores] = useState<IntegrationStore[]>([]);
    const [stores, setStores] = useState<StoreType[]>([]);
    const [shippingProviders, setShippingProviders] = useState<ShippingProvider[]>([]);

    // Store connection modal
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [editingStoreConnection, setEditingStoreConnection] = useState<IntegrationStore | null>(null);
    const [storeForm, setStoreForm] = useState({
        storeId: '',
        shippingProviderId: '',
        sellerId: '',
        apiKey: '',
        apiSecret: '',
        crawlIntervalMinutes: 60,
        sendStock: true,
        sendPrice: true,
        sendOrderStatus: true,
        isActive: true,
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [intRes, storesRes, integrationStoresRes, providersRes] = await Promise.all([
                getIntegration(integrationId),
                getStores(1, 100),
                getIntegrationStores(integrationId),
                getActiveShippingProviders(),
            ]);

            setIntegration(intRes.data);
            setStores(storesRes.data || []);
            setIntegrationStores(integrationStoresRes || []);
            setShippingProviders(providersRes || []);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message || 'Veri yüklenemedi' });
        } finally {
            setLoading(false);
        }
    }, [integrationId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleEditStoreConnection = (conn: IntegrationStore) => {
        setEditingStoreConnection(conn);
        setStoreForm({
            storeId: conn.storeId,
            shippingProviderId: conn.shippingProviderId || '',
            sellerId: conn.sellerId,
            apiKey: conn.apiKey,
            apiSecret: conn.apiSecret,
            crawlIntervalMinutes: conn.crawlIntervalMinutes,
            sendStock: conn.sendStock,
            sendPrice: conn.sendPrice,
            sendOrderStatus: conn.sendOrderStatus,
            isActive: conn.isActive,
        });
        setIsStoreModalOpen(true);
    };

    const handleAddStoreConnection = () => {
        setEditingStoreConnection(null);
        setStoreForm({
            storeId: stores[0]?.id || '',
            shippingProviderId: '',
            sellerId: '',
            apiKey: '',
            apiSecret: '',
            crawlIntervalMinutes: 60,
            sendStock: true,
            sendPrice: true,
            sendOrderStatus: true,
            isActive: true,
        });
        setIsStoreModalOpen(true);
    };

    const handleSaveStoreConnection = async () => {
        try {
            if (editingStoreConnection) {
                await updateIntegrationStore(editingStoreConnection.id, storeForm);
                toast({ title: 'Başarılı', description: 'Mağaza bağlantısı güncellendi', variant: 'success' });
            } else {
                await createIntegrationStore({
                    integrationId,
                    ...storeForm,
                });
                toast({ title: 'Başarılı', description: 'Mağaza bağlantısı oluşturuldu', variant: 'success' });
            }
            setIsStoreModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        }
    };

    const handleDeleteStoreConnection = async (id: string) => {
        if (!confirm('Bu mağaza bağlantısını silmek istediğinize emin misiniz?')) return;
        try {
            await deleteIntegrationStore(id);
            toast({ title: 'Başarılı', description: 'Mağaza bağlantısı silindi', variant: 'success' });
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        }
    };

    const handleUpdateIntegration = async (data: Partial<Integration>) => {
        try {
            await updateIntegration(integrationId, data);
            toast({ title: 'Başarılı', description: 'Entegrasyon güncellendi', variant: 'success' });
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!integration) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-muted-foreground">Entegrasyon bulunamadı</p>
                <Button onClick={() => router.push('/integrations')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Geri Dön
                </Button>
            </div>
        );
    }

    const connectedStoreIds = integrationStores.map(s => s.storeId);
    const availableStores = stores.filter(s => !connectedStoreIds.includes(s.id) || editingStoreConnection?.storeId === s.id);

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
                            <BreadcrumbLink href="/integrations">Entegrasyonlar</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{integration.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <Button variant="outline" onClick={() => router.push('/integrations')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Geri
                </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="general" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Genel
                    </TabsTrigger>
                    <TabsTrigger value="stores" className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Mağaza Bağlantıları
                    </TabsTrigger>
                    <TabsTrigger value="products" className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Ürün Bağlantıları
                    </TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Entegrasyon Bilgileri</CardTitle>
                            <CardDescription>Entegrasyon temel ayarlarını düzenleyin</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Adı</Label>
                                    <Input
                                        value={integration.name}
                                        disabled
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipi</Label>
                                    <Input
                                        value={INTEGRATION_TYPE_LABELS[integration.type] || integration.type}
                                        disabled
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>API URL</Label>
                                    <Input
                                        value={integration.apiUrl}
                                        disabled
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="space-y-0.5">
                                    <Label>Durum</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Entegrasyonu aktif/pasif yapın
                                    </p>
                                </div>
                                <Switch
                                    checked={integration.isActive}
                                    onCheckedChange={(checked) => handleUpdateIntegration({ isActive: checked })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Store Connections Tab */}
                <TabsContent value="stores">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Mağaza Bağlantıları</CardTitle>
                                <CardDescription>
                                    Bu entegrasyona bağlı mağazaları ve ayarlarını yönetin
                                </CardDescription>
                            </div>
                            <Button onClick={handleAddStoreConnection} disabled={availableStores.length === 0}>
                                <Plus className="w-4 h-4 mr-2" />
                                Mağaza Bağla
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {integrationStores.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Henüz bağlı mağaza yok
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mağaza</TableHead>
                                            <TableHead>Satıcı ID</TableHead>
                                            <TableHead>Kargo</TableHead>
                                            <TableHead>Stok</TableHead>
                                            <TableHead>Fiyat</TableHead>
                                            <TableHead>Durum</TableHead>
                                            <TableHead className="text-right">İşlemler</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {integrationStores.map((conn) => {
                                            const store = stores.find(s => s.id === conn.storeId);
                                            const provider = shippingProviders.find(p => p.id === conn.shippingProviderId);
                                            return (
                                                <TableRow key={conn.id}>
                                                    <TableCell className="font-medium">
                                                        {store?.name || conn.storeName || 'Bilinmeyen'}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {conn.sellerId}
                                                    </TableCell>
                                                    <TableCell>
                                                        {provider?.name || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={conn.sendStock ? 'default' : 'secondary'}>
                                                            {conn.sendStock ? 'Aktif' : 'Pasif'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={conn.sendPrice ? 'default' : 'secondary'}>
                                                            {conn.sendPrice ? 'Aktif' : 'Pasif'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={conn.isActive ? 'default' : 'destructive'}>
                                                            {conn.isActive ? 'Aktif' : 'Pasif'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEditStoreConnection(conn)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteStoreConnection(conn.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Product Connections Tab */}
                <TabsContent value="products">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Ürün Bağlantıları</CardTitle>
                                <CardDescription>
                                    Bu entegrasyona bağlı ürünleri görüntüleyin
                                </CardDescription>
                            </div>
                            <Button disabled>
                                <Plus className="w-4 h-4 mr-2" />
                                Ürün Bağla
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground">
                                Ürün bağlantıları yakında eklenecek
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Store Connection Modal */}
            <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingStoreConnection ? 'Mağaza Bağlantısını Düzenle' : 'Yeni Mağaza Bağla'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Mağaza</Label>
                            <Select
                                value={storeForm.storeId}
                                onValueChange={(v) => setStoreForm({ ...storeForm, storeId: v })}
                                disabled={!!editingStoreConnection}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Mağaza seçin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableStores.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Kargo Firması</Label>
                            <Select
                                value={storeForm.shippingProviderId}
                                onValueChange={(v) => setStoreForm({ ...storeForm, shippingProviderId: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Yok</SelectItem>
                                    {shippingProviders.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Satıcı ID</Label>
                                <Input
                                    value={storeForm.sellerId}
                                    onChange={(e) => setStoreForm({ ...storeForm, sellerId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Senkronizasyon Aralığı (dk)</Label>
                                <Input
                                    type="number"
                                    value={storeForm.crawlIntervalMinutes}
                                    onChange={(e) => setStoreForm({ ...storeForm, crawlIntervalMinutes: parseInt(e.target.value) || 60 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                                value={storeForm.apiKey}
                                onChange={(e) => setStoreForm({ ...storeForm, apiKey: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>API Secret</Label>
                            <Input
                                type="password"
                                value={storeForm.apiSecret}
                                onChange={(e) => setStoreForm({ ...storeForm, apiSecret: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={storeForm.sendStock}
                                    onCheckedChange={(c) => setStoreForm({ ...storeForm, sendStock: c })}
                                />
                                <Label>Stok Gönder</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={storeForm.sendPrice}
                                    onCheckedChange={(c) => setStoreForm({ ...storeForm, sendPrice: c })}
                                />
                                <Label>Fiyat Gönder</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={storeForm.isActive}
                                    onCheckedChange={(c) => setStoreForm({ ...storeForm, isActive: c })}
                                />
                                <Label>Aktif</Label>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsStoreModalOpen(false)}>
                                İptal
                            </Button>
                            <Button onClick={handleSaveStoreConnection}>
                                Kaydet
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
