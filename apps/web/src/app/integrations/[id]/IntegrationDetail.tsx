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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from '@/components/ui/use-toast';
import {
    Loader2,
    ArrowLeft,
    Plus,
    Pencil,
    Trash2,
    Settings,
    Package,
    Store,
    Building2,
    FileText,
    RefreshCw,
    CheckCircle2,
    XCircle,
    FileSpreadsheet,
    Truck,
} from 'lucide-react';
import {
    getIntegration,
    getIntegrationStores,
    getStores,
    updateIntegration,
    createIntegrationStore,
    updateIntegrationStore,
    deleteIntegrationStore,
    getActiveShippingProviders,
    getProductIntegrations,
    updateProductIntegration,
    deleteProductIntegration,
    Integration,
    IntegrationStore,
    Store as StoreType,
    ShippingProvider,
    ProductIntegration,
} from '@/lib/api';

interface Props {
    integrationId: string;
}

const INTEGRATION_TYPE_LABELS: Record<string, string> = {
    TRENDYOL: 'Trendyol',
    HEPSIBURADA: 'Hepsiburada',
    IKAS: 'Ikas',
};

const INTEGRATION_TYPE_COLORS: Record<string, string> = {
    TRENDYOL: 'bg-orange-500',
    HEPSIBURADA: 'bg-orange-600',
    IKAS: 'bg-purple-500',
};

export function IntegrationDetail({ integrationId }: Props) {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [integration, setIntegration] = useState<Integration | null>(null);
    const [integrationStores, setIntegrationStores] = useState<IntegrationStore[]>([]);
    const [stores, setStores] = useState<StoreType[]>([]);
    const [shippingProviders, setShippingProviders] = useState<ShippingProvider[]>([]);
    const [productIntegrations, setProductIntegrations] = useState<ProductIntegration[]>([]);

    // Product integration edit modal
    const [editingProductIntegration, setEditingProductIntegration] = useState<ProductIntegration | null>(null);
    const [productIntegrationForm, setProductIntegrationForm] = useState({
        integrationSalePrice: '',
        isActive: true,
    });

    // Store connection modal
    const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
    const [editingStoreConnection, setEditingStoreConnection] = useState<IntegrationStore | null>(null);
    const [storeModalTab, setStoreModalTab] = useState('general');
    const [saving, setSaving] = useState(false);

    // Complete store form with all fields
    const [storeForm, setStoreForm] = useState<Partial<IntegrationStore>>({
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
        // Company Config
        brandCode: '',
        companyCode: '',
        branchCode: '',
        coCode: '',
        // Invoice Settings
        invoiceEnabled: true,
        invoiceTransactionCode: '',
        hasMicroExport: false,
        // E-Arşiv
        eArchiveBulkCustomer: false,
        eArchiveCardCode: '',
        eArchiveAccountCode: '',
        eArchiveSerialNo: '',
        eArchiveSequenceNo: '',
        eArchiveHavaleCardCode: '',
        eArchiveHavaleAccountCode: '',
        // E-Fatura
        eInvoiceBulkCustomer: false,
        eInvoiceCardCode: '',
        eInvoiceAccountCode: '',
        eInvoiceSerialNo: '',
        eInvoiceSequenceNo: '',
        eInvoiceHavaleAccountCode: '',
        // Toplu
        bulkEArchiveSerialNo: '',
        bulkEArchiveSequenceNo: '',
        bulkEInvoiceSerialNo: '',
        bulkEInvoiceSequenceNo: '',
        // İade
        refundExpenseVoucherEArchiveSerialNo: '',
        refundExpenseVoucherEArchiveSequenceNo: '',
        refundExpenseVoucherEInvoiceSerialNo: '',
        refundExpenseVoucherEInvoiceSequenceNo: '',
        // Mikro İhracat
        microExportTransactionCode: '',
        microExportAccountCode: '',
        microExportAzAccountCode: '',
        microExportEArchiveSerialNo: '',
        microExportEArchiveSequenceNo: '',
        microExportBulkSerialNo: '',
        microExportBulkSequenceNo: '',
        microExportRefundSerialNo: '',
        microExportRefundSequenceNo: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [intRes, storesRes, integrationStoresRes, providersRes, productIntegrationsRes] = await Promise.all([
                getIntegration(integrationId),
                getStores(1, 100),
                getIntegrationStores(integrationId),
                getActiveShippingProviders(),
                getProductIntegrations({ integrationId }),
            ]);

            setIntegration(intRes.data);
            setStores(storesRes.data || []);
            setIntegrationStores(integrationStoresRes || []);
            setShippingProviders(providersRes || []);
            setProductIntegrations(productIntegrationsRes || []);
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
            // Company Config
            brandCode: conn.brandCode || '',
            companyCode: conn.companyCode || '',
            branchCode: conn.branchCode || '',
            coCode: conn.coCode || '',
            // Invoice Settings
            invoiceEnabled: conn.invoiceEnabled !== false,
            invoiceTransactionCode: conn.invoiceTransactionCode || '',
            hasMicroExport: conn.hasMicroExport || false,
            // E-Arşiv
            eArchiveBulkCustomer: conn.eArchiveBulkCustomer || false,
            eArchiveCardCode: conn.eArchiveCardCode || '',
            eArchiveAccountCode: conn.eArchiveAccountCode || '',
            eArchiveSerialNo: conn.eArchiveSerialNo || '',
            eArchiveSequenceNo: conn.eArchiveSequenceNo || '',
            eArchiveHavaleCardCode: conn.eArchiveHavaleCardCode || '',
            eArchiveHavaleAccountCode: conn.eArchiveHavaleAccountCode || '',
            // E-Fatura
            eInvoiceBulkCustomer: conn.eInvoiceBulkCustomer || false,
            eInvoiceCardCode: conn.eInvoiceCardCode || '',
            eInvoiceAccountCode: conn.eInvoiceAccountCode || '',
            eInvoiceSerialNo: conn.eInvoiceSerialNo || '',
            eInvoiceSequenceNo: conn.eInvoiceSequenceNo || '',
            eInvoiceHavaleAccountCode: conn.eInvoiceHavaleAccountCode || '',
            // Toplu
            bulkEArchiveSerialNo: conn.bulkEArchiveSerialNo || '',
            bulkEArchiveSequenceNo: conn.bulkEArchiveSequenceNo || '',
            bulkEInvoiceSerialNo: conn.bulkEInvoiceSerialNo || '',
            bulkEInvoiceSequenceNo: conn.bulkEInvoiceSequenceNo || '',
            // İade
            refundExpenseVoucherEArchiveSerialNo: conn.refundExpenseVoucherEArchiveSerialNo || '',
            refundExpenseVoucherEArchiveSequenceNo: conn.refundExpenseVoucherEArchiveSequenceNo || '',
            refundExpenseVoucherEInvoiceSerialNo: conn.refundExpenseVoucherEInvoiceSerialNo || '',
            refundExpenseVoucherEInvoiceSequenceNo: conn.refundExpenseVoucherEInvoiceSequenceNo || '',
            // Mikro İhracat
            microExportTransactionCode: conn.microExportTransactionCode || '',
            microExportAccountCode: conn.microExportAccountCode || '',
            microExportAzAccountCode: conn.microExportAzAccountCode || '',
            microExportEArchiveSerialNo: conn.microExportEArchiveSerialNo || '',
            microExportEArchiveSequenceNo: conn.microExportEArchiveSequenceNo || '',
            microExportBulkSerialNo: conn.microExportBulkSerialNo || '',
            microExportBulkSequenceNo: conn.microExportBulkSequenceNo || '',
            microExportRefundSerialNo: conn.microExportRefundSerialNo || '',
            microExportRefundSequenceNo: conn.microExportRefundSequenceNo || '',
        });
        setStoreModalTab('general');
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
            brandCode: '',
            companyCode: '',
            branchCode: '',
            coCode: '',
            invoiceEnabled: true,
            invoiceTransactionCode: '',
            hasMicroExport: false,
            eArchiveBulkCustomer: false,
            eArchiveCardCode: '',
            eArchiveAccountCode: '',
            eArchiveSerialNo: '',
            eArchiveSequenceNo: '',
            eArchiveHavaleCardCode: '',
            eArchiveHavaleAccountCode: '',
            eInvoiceBulkCustomer: false,
            eInvoiceCardCode: '',
            eInvoiceAccountCode: '',
            eInvoiceSerialNo: '',
            eInvoiceSequenceNo: '',
            eInvoiceHavaleAccountCode: '',
            bulkEArchiveSerialNo: '',
            bulkEArchiveSequenceNo: '',
            bulkEInvoiceSerialNo: '',
            bulkEInvoiceSequenceNo: '',
            refundExpenseVoucherEArchiveSerialNo: '',
            refundExpenseVoucherEArchiveSequenceNo: '',
            refundExpenseVoucherEInvoiceSerialNo: '',
            refundExpenseVoucherEInvoiceSequenceNo: '',
            microExportTransactionCode: '',
            microExportAccountCode: '',
            microExportAzAccountCode: '',
            microExportEArchiveSerialNo: '',
            microExportEArchiveSequenceNo: '',
            microExportBulkSerialNo: '',
            microExportBulkSequenceNo: '',
            microExportRefundSerialNo: '',
            microExportRefundSequenceNo: '',
        });
        setStoreModalTab('general');
        setIsStoreModalOpen(true);
    };

    const handleSaveStoreConnection = async () => {
        setSaving(true);
        try {
            if (editingStoreConnection) {
                await updateIntegrationStore(editingStoreConnection.id, storeForm);
                toast({ title: 'Başarılı', description: 'Mağaza bağlantısı güncellendi', variant: 'success' });
            } else {
                await createIntegrationStore({
                    integrationId,
                    ...storeForm,
                } as any);
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

    const updateFormField = (field: string, value: any) => {
        setStoreForm(prev => ({ ...prev, [field]: value }));
    };

    // Product Integration handlers
    const handleEditProductIntegration = (pi: ProductIntegration) => {
        setEditingProductIntegration(pi);
        setProductIntegrationForm({
            integrationSalePrice: pi.integrationSalePrice?.toString() || '',
            isActive: pi.isActive,
        });
    };

    const handleSaveProductIntegration = async () => {
        if (!editingProductIntegration) return;
        setSaving(true);
        try {
            await updateProductIntegration(editingProductIntegration.id, {
                integrationSalePrice: productIntegrationForm.integrationSalePrice
                    ? parseFloat(productIntegrationForm.integrationSalePrice)
                    : undefined,
                isActive: productIntegrationForm.isActive,
            });
            toast({ title: 'Başarılı', description: 'Ürün bağlantısı güncellendi', variant: 'success' });
            setEditingProductIntegration(null);
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProductIntegration = async (id: string) => {
        if (!confirm('Bu ürün bağlantısını silmek istediğinize emin misiniz?')) return;
        try {
            await deleteProductIntegration(id);
            toast({ title: 'Başarılı', description: 'Ürün bağlantısı silindi', variant: 'success' });
            fetchData();
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        }
    };

    // Calculate final price for display
    const calculateFinalPrice = (pi: ProductIntegration): number => {
        if (pi.integrationSalePrice !== null) return pi.integrationSalePrice;
        if (pi.store?.storeSalePrice !== null && pi.store?.storeSalePrice !== undefined) return pi.store.storeSalePrice;
        return pi.product?.salePrice || 0;
    };

    const getPriceSource = (pi: ProductIntegration): string => {
        if (pi.integrationSalePrice !== null) return 'Entegrasyon';
        if (pi.store?.storeSalePrice !== null && pi.store?.storeSalePrice !== undefined) return 'Mağaza';
        return 'Ürün';
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
                            <BreadcrumbPage className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${INTEGRATION_TYPE_COLORS[integration.type]}`} />
                                {integration.name}
                            </BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Yenile
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push('/integrations')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Geri
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tip</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{INTEGRATION_TYPE_LABELS[integration.type]}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bağlı Mağaza</CardTitle>
                        <Store className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{integrationStores.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aktif Mağaza</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {integrationStores.filter(s => s.isActive).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Durum</CardTitle>
                        {integration.isActive ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Badge variant={integration.isActive ? 'default' : 'destructive'}>
                                {integration.isActive ? 'Aktif' : 'Pasif'}
                            </Badge>
                            <Switch
                                checked={integration.isActive}
                                onCheckedChange={(checked) => handleUpdateIntegration({ isActive: checked })}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="stores" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="stores" className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        Mağaza Bağlantıları
                    </TabsTrigger>
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Genel Ayarlar
                    </TabsTrigger>
                    <TabsTrigger value="products" className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Ürün Bağlantıları
                    </TabsTrigger>
                </TabsList>

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
                                <div className="text-center py-12 text-muted-foreground">
                                    <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="text-lg font-medium">Henüz bağlı mağaza yok</p>
                                    <p className="text-sm mt-1">Mağaza bağlayarak entegrasyonu aktif hale getirin</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mağaza</TableHead>
                                            <TableHead>Satıcı ID</TableHead>
                                            <TableHead>Kargo</TableHead>
                                            <TableHead className="text-center">Stok</TableHead>
                                            <TableHead className="text-center">Fiyat</TableHead>
                                            <TableHead className="text-center">Fatura</TableHead>
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
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Store className="w-4 h-4 text-muted-foreground" />
                                                            <span className="font-medium">
                                                                {store?.name || conn.storeName || 'Bilinmeyen'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <code className="text-xs bg-muted px-2 py-1 rounded">
                                                            {conn.sellerId}
                                                        </code>
                                                    </TableCell>
                                                    <TableCell>
                                                        {provider ? (
                                                            <div className="flex items-center gap-1">
                                                                <Truck className="w-3 h-3" />
                                                                <span className="text-sm">{provider.name}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {conn.sendStock ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {conn.sendPrice ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {conn.invoiceEnabled !== false ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={conn.isActive ? 'default' : 'secondary'}>
                                                            {conn.isActive ? 'Aktif' : 'Pasif'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEditStoreConnection(conn)}
                                                                title="Düzenle"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteStoreConnection(conn.id)}
                                                                title="Sil"
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

                {/* General Tab */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Entegrasyon Bilgileri</CardTitle>
                            <CardDescription>Entegrasyon temel ayarları</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Adı</Label>
                                    <Input value={integration.name} disabled />
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
                                    <Input value={integration.apiUrl} disabled />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Product Connections Tab */}
                <TabsContent value="products">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <CardTitle>Ürün Bağlantıları</CardTitle>
                                    <CardDescription>
                                        Bu entegrasyona bağlı ürünleri ve fiyat ayarlarını yönetin
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="w-fit">
                                    {productIntegrations.length} Ürün
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {productIntegrations.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>Henüz bağlı ürün yok</p>
                                    <p className="text-sm mt-2">Ürünleri mağazalara bağladıktan sonra entegrasyon bazlı fiyat ayarlayabilirsiniz.</p>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Ürün</TableHead>
                                                <TableHead>SKU</TableHead>
                                                <TableHead>Mağaza</TableHead>
                                                <TableHead className="text-right">Ürün Fiyatı</TableHead>
                                                <TableHead className="text-right">Mağaza Fiyatı</TableHead>
                                                <TableHead className="text-right">Entegrasyon Fiyatı</TableHead>
                                                <TableHead className="text-right">Final Fiyat</TableHead>
                                                <TableHead className="text-center">Durum</TableHead>
                                                <TableHead className="text-right">İşlemler</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productIntegrations.map((pi) => (
                                                <TableRow key={pi.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="max-w-[200px]">
                                                            <p className="truncate">{pi.product?.name || '-'}</p>
                                                            {pi.product?.barcode && (
                                                                <p className="text-xs text-muted-foreground">{pi.product.barcode}</p>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{pi.product?.sku || '-'}</TableCell>
                                                    <TableCell>{pi.store?.name || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        {pi.product?.salePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {pi.store?.storeSalePrice !== null && pi.store?.storeSalePrice !== undefined
                                                            ? `${pi.store.storeSalePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                                                            : <span className="text-muted-foreground">-</span>
                                                        }
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {pi.integrationSalePrice !== null
                                                            ? `${pi.integrationSalePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺`
                                                            : <span className="text-muted-foreground">-</span>
                                                        }
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-semibold">
                                                                {calculateFinalPrice(pi).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                                                            </span>
                                                            <Badge variant="secondary" className="text-xs mt-1">
                                                                {getPriceSource(pi)}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {pi.isActive ? (
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
                                                                onClick={() => handleEditProductIntegration(pi)}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeleteProductIntegration(pi.id)}
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

                {/* Product Integration Edit Modal */}
                <Dialog open={!!editingProductIntegration} onOpenChange={(open) => !open && setEditingProductIntegration(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Ürün Bağlantısını Düzenle</DialogTitle>
                            <DialogDescription>
                                {editingProductIntegration?.product?.name}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Ürün Fiyatı:</span>
                                    <span>{editingProductIntegration?.product?.salePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                </div>
                                {editingProductIntegration?.store?.storeSalePrice !== null && editingProductIntegration?.store?.storeSalePrice !== undefined && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Mağaza Fiyatı ({editingProductIntegration?.store?.name}):</span>
                                        <span>{editingProductIntegration?.store?.storeSalePrice?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Entegrasyon Fiyatı (₺)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Boş bırakılırsa mağaza/ürün fiyatı kullanılır"
                                    value={productIntegrationForm.integrationSalePrice}
                                    onChange={(e) => setProductIntegrationForm(prev => ({ ...prev, integrationSalePrice: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Bu fiyat en yüksek önceliğe sahiptir. Boş bırakılırsa mağaza fiyatı, o da yoksa ürün fiyatı kullanılır.
                                </p>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <Label>Aktif</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Bu bağlantı üzerinden stok/fiyat senkronizasyonu yapılsın mı?
                                    </p>
                                </div>
                                <Switch
                                    checked={productIntegrationForm.isActive}
                                    onCheckedChange={(c) => setProductIntegrationForm(prev => ({ ...prev, isActive: c }))}
                                />
                            </div>
                        </div>

                        <Separator />

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setEditingProductIntegration(null)}>
                                İptal
                            </Button>
                            <Button onClick={handleSaveProductIntegration} disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Kaydet
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </Tabs>

            {/* Store Connection Modal */}
            <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Store className="w-5 h-5" />
                            {editingStoreConnection ? 'Mağaza Bağlantısını Düzenle' : 'Yeni Mağaza Bağla'}
                        </DialogTitle>
                        <DialogDescription>
                            Mağaza entegrasyon ayarlarını yapılandırın
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={storeModalTab} onValueChange={setStoreModalTab} className="w-full">
                        <TabsList className={`grid w-full ${storeForm.hasMicroExport ? 'grid-cols-4' : 'grid-cols-3'}`}>
                            <TabsTrigger value="general" className="text-xs sm:text-sm">
                                <Settings className="w-4 h-4 mr-1 hidden sm:inline" />
                                Genel
                            </TabsTrigger>
                            <TabsTrigger value="company" className="text-xs sm:text-sm">
                                <Building2 className="w-4 h-4 mr-1 hidden sm:inline" />
                                Şirket
                            </TabsTrigger>
                            <TabsTrigger value="invoice" className="text-xs sm:text-sm">
                                <FileText className="w-4 h-4 mr-1 hidden sm:inline" />
                                Fatura
                            </TabsTrigger>
                            {storeForm.hasMicroExport && (
                                <TabsTrigger value="microexport" className="text-xs sm:text-sm">
                                    <FileSpreadsheet className="w-4 h-4 mr-1 hidden sm:inline" />
                                    Mikro İhracat
                                </TabsTrigger>
                            )}
                        </TabsList>

                        <ScrollArea className="h-[50vh] mt-4 pr-4">
                            {/* General Settings */}
                            <TabsContent value="general" className="space-y-4 mt-0">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Mağaza</Label>
                                        <Select
                                            value={storeForm.storeId}
                                            onValueChange={(v) => updateFormField('storeId', v)}
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
                                            value={storeForm.shippingProviderId || '__none__'}
                                            onValueChange={(v) => updateFormField('shippingProviderId', v === '__none__' ? null : v)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seçiniz" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">Yok</SelectItem>
                                                {shippingProviders.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Satıcı ID</Label>
                                        <Input
                                            value={storeForm.sellerId}
                                            onChange={(e) => updateFormField('sellerId', e.target.value)}
                                            placeholder="Marketplace Satıcı ID"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Senkronizasyon Aralığı (dk)</Label>
                                        <Input
                                            type="number"
                                            value={storeForm.crawlIntervalMinutes}
                                            onChange={(e) => updateFormField('crawlIntervalMinutes', parseInt(e.target.value) || 60)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <Input
                                        value={storeForm.apiKey}
                                        onChange={(e) => updateFormField('apiKey', e.target.value)}
                                        placeholder="API anahtarı"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>API Secret</Label>
                                    <Input
                                        type="password"
                                        value={storeForm.apiSecret}
                                        onChange={(e) => updateFormField('apiSecret', e.target.value)}
                                        placeholder="API gizli anahtarı"
                                    />
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h4 className="font-medium">Senkronizasyon Ayarları</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <Label>Stok Gönder</Label>
                                                <p className="text-xs text-muted-foreground">Stok bilgilerini pazaryerine gönder</p>
                                            </div>
                                            <Switch
                                                checked={storeForm.sendStock}
                                                onCheckedChange={(c) => updateFormField('sendStock', c)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <Label>Fiyat Gönder</Label>
                                                <p className="text-xs text-muted-foreground">Fiyat bilgilerini pazaryerine gönder</p>
                                            </div>
                                            <Switch
                                                checked={storeForm.sendPrice}
                                                onCheckedChange={(c) => updateFormField('sendPrice', c)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <Label>Sipariş Durumu</Label>
                                                <p className="text-xs text-muted-foreground">Sipariş durumlarını gönder</p>
                                            </div>
                                            <Switch
                                                checked={storeForm.sendOrderStatus}
                                                onCheckedChange={(c) => updateFormField('sendOrderStatus', c)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="space-y-0.5">
                                                <Label>Aktif</Label>
                                                <p className="text-xs text-muted-foreground">Entegrasyon aktif mi?</p>
                                            </div>
                                            <Switch
                                                checked={storeForm.isActive}
                                                onCheckedChange={(c) => updateFormField('isActive', c)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Company Settings */}
                            <TabsContent value="company" className="space-y-4 mt-0">
                                <div className="rounded-lg border p-4 bg-muted/30">
                                    <h4 className="font-medium mb-3 flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        Şirket Konfigürasyonu
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Marka Kodu</Label>
                                            <Input
                                                value={storeForm.brandCode}
                                                onChange={(e) => updateFormField('brandCode', e.target.value)}
                                                placeholder="Marka kodu"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Şirket Kodu</Label>
                                            <Input
                                                value={storeForm.companyCode}
                                                onChange={(e) => updateFormField('companyCode', e.target.value)}
                                                placeholder="Şirket kodu"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Şube Kodu</Label>
                                            <Input
                                                value={storeForm.branchCode}
                                                onChange={(e) => updateFormField('branchCode', e.target.value)}
                                                placeholder="Şube kodu"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>CO Kodu</Label>
                                            <Input
                                                value={storeForm.coCode}
                                                onChange={(e) => updateFormField('coCode', e.target.value)}
                                                placeholder="CO kodu"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Invoice Settings */}
                            <TabsContent value="invoice" className="space-y-4 mt-0">
                                {/* Fatura Aktif/Pasif Toggle */}
                                <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-medium">Faturalama Aktif</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Bu mağaza için otomatik fatura oluşturulsun mu?
                                        </p>
                                    </div>
                                    <Switch
                                        checked={storeForm.invoiceEnabled}
                                        onCheckedChange={(c) => updateFormField('invoiceEnabled', c)}
                                    />
                                </div>

                                <Accordion type="multiple" className="w-full" defaultValue={['general-invoice']}>
                                    {/* Genel Fatura */}
                                    <AccordionItem value="general-invoice">
                                        <AccordionTrigger>Genel Fatura Ayarları</AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>İşlem Kodu</Label>
                                                    <Input
                                                        value={storeForm.invoiceTransactionCode}
                                                        onChange={(e) => updateFormField('invoiceTransactionCode', e.target.value)}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg border p-3">
                                                    <Label>Mikro İhracat Var</Label>
                                                    <Switch
                                                        checked={storeForm.hasMicroExport}
                                                        onCheckedChange={(c) => {
                                                            updateFormField('hasMicroExport', c);
                                                            if (c) {
                                                                setStoreModalTab('microexport');
                                                            } else if (storeModalTab === 'microexport') {
                                                                setStoreModalTab('invoice');
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* E-Arşiv */}
                                    <AccordionItem value="e-arsiv">
                                        <AccordionTrigger>E-Arşiv Ayarları</AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Kart Kodu</Label>
                                                    <Input
                                                        value={storeForm.eArchiveCardCode}
                                                        onChange={(e) => updateFormField('eArchiveCardCode', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Hesap Kodu</Label>
                                                    <Input
                                                        value={storeForm.eArchiveAccountCode}
                                                        onChange={(e) => updateFormField('eArchiveAccountCode', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Seri No</Label>
                                                    <Input
                                                        value={storeForm.eArchiveSerialNo}
                                                        onChange={(e) => updateFormField('eArchiveSerialNo', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Sıra No</Label>
                                                    <Input
                                                        value={storeForm.eArchiveSequenceNo}
                                                        onChange={(e) => updateFormField('eArchiveSequenceNo', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Havale Kart Kodu</Label>
                                                    <Input
                                                        value={storeForm.eArchiveHavaleCardCode}
                                                        onChange={(e) => updateFormField('eArchiveHavaleCardCode', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Havale Hesap Kodu</Label>
                                                    <Input
                                                        value={storeForm.eArchiveHavaleAccountCode}
                                                        onChange={(e) => updateFormField('eArchiveHavaleAccountCode', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* E-Fatura */}
                                    <AccordionItem value="e-fatura">
                                        <AccordionTrigger>E-Fatura Ayarları</AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Kart Kodu</Label>
                                                    <Input
                                                        value={storeForm.eInvoiceCardCode}
                                                        onChange={(e) => updateFormField('eInvoiceCardCode', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Hesap Kodu</Label>
                                                    <Input
                                                        value={storeForm.eInvoiceAccountCode}
                                                        onChange={(e) => updateFormField('eInvoiceAccountCode', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Seri No</Label>
                                                    <Input
                                                        value={storeForm.eInvoiceSerialNo}
                                                        onChange={(e) => updateFormField('eInvoiceSerialNo', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Sıra No</Label>
                                                    <Input
                                                        value={storeForm.eInvoiceSequenceNo}
                                                        onChange={(e) => updateFormField('eInvoiceSequenceNo', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2 col-span-2">
                                                    <Label>Havale Hesap Kodu</Label>
                                                    <Input
                                                        value={storeForm.eInvoiceHavaleAccountCode}
                                                        onChange={(e) => updateFormField('eInvoiceHavaleAccountCode', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* Toplu Fatura */}
                                    <AccordionItem value="bulk">
                                        <AccordionTrigger>Toplu Faturalama Ayarları</AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>E-Arşiv Seri No</Label>
                                                    <Input
                                                        value={storeForm.bulkEArchiveSerialNo}
                                                        onChange={(e) => updateFormField('bulkEArchiveSerialNo', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>E-Arşiv Sıra No</Label>
                                                    <Input
                                                        value={storeForm.bulkEArchiveSequenceNo}
                                                        onChange={(e) => updateFormField('bulkEArchiveSequenceNo', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>E-Fatura Seri No</Label>
                                                    <Input
                                                        value={storeForm.bulkEInvoiceSerialNo}
                                                        onChange={(e) => updateFormField('bulkEInvoiceSerialNo', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>E-Fatura Sıra No</Label>
                                                    <Input
                                                        value={storeForm.bulkEInvoiceSequenceNo}
                                                        onChange={(e) => updateFormField('bulkEInvoiceSequenceNo', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    {/* İade Gider Pusulası */}
                                    <AccordionItem value="refund">
                                        <AccordionTrigger>İade Gider Pusulası Ayarları</AccordionTrigger>
                                        <AccordionContent className="space-y-4 pt-2">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>E-Arşiv Seri No</Label>
                                                    <Input
                                                        value={storeForm.refundExpenseVoucherEArchiveSerialNo}
                                                        onChange={(e) => updateFormField('refundExpenseVoucherEArchiveSerialNo', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>E-Arşiv Sıra No</Label>
                                                    <Input
                                                        value={storeForm.refundExpenseVoucherEArchiveSequenceNo}
                                                        onChange={(e) => updateFormField('refundExpenseVoucherEArchiveSequenceNo', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>E-Fatura Seri No</Label>
                                                    <Input
                                                        value={storeForm.refundExpenseVoucherEInvoiceSerialNo}
                                                        onChange={(e) => updateFormField('refundExpenseVoucherEInvoiceSerialNo', e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>E-Fatura Sıra No</Label>
                                                    <Input
                                                        value={storeForm.refundExpenseVoucherEInvoiceSequenceNo}
                                                        onChange={(e) => updateFormField('refundExpenseVoucherEInvoiceSequenceNo', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </TabsContent>

                            {/* Micro Export Settings */}
                            <TabsContent value="microexport" className="space-y-4 mt-0">
                                <div className="rounded-lg border p-4 bg-muted/30">
                                    <h4 className="font-medium mb-4 flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4" />
                                        Mikro İhracat Ayarları
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>İşlem Kodu</Label>
                                            <Input
                                                value={storeForm.microExportTransactionCode}
                                                onChange={(e) => updateFormField('microExportTransactionCode', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Hesap Kodu</Label>
                                            <Input
                                                value={storeForm.microExportAccountCode}
                                                onChange={(e) => updateFormField('microExportAccountCode', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-2">
                                            <Label>AZ Hesap Kodu</Label>
                                            <Input
                                                value={storeForm.microExportAzAccountCode}
                                                onChange={(e) => updateFormField('microExportAzAccountCode', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>E-Arşiv Seri No</Label>
                                        <Input
                                            value={storeForm.microExportEArchiveSerialNo}
                                            onChange={(e) => updateFormField('microExportEArchiveSerialNo', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>E-Arşiv Sıra No</Label>
                                        <Input
                                            value={storeForm.microExportEArchiveSequenceNo}
                                            onChange={(e) => updateFormField('microExportEArchiveSequenceNo', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Toplu Seri No</Label>
                                        <Input
                                            value={storeForm.microExportBulkSerialNo}
                                            onChange={(e) => updateFormField('microExportBulkSerialNo', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Toplu Sıra No</Label>
                                        <Input
                                            value={storeForm.microExportBulkSequenceNo}
                                            onChange={(e) => updateFormField('microExportBulkSequenceNo', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>İade Seri No</Label>
                                        <Input
                                            value={storeForm.microExportRefundSerialNo}
                                            onChange={(e) => updateFormField('microExportRefundSerialNo', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>İade Sıra No</Label>
                                        <Input
                                            value={storeForm.microExportRefundSequenceNo}
                                            onChange={(e) => updateFormField('microExportRefundSequenceNo', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>

                    <Separator className="my-4" />

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsStoreModalOpen(false)}>
                            İptal
                        </Button>
                        <Button onClick={handleSaveStoreConnection} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Kaydet
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
