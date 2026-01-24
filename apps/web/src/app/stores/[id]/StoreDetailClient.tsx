'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Store as StoreIcon, Settings, FileText, RefreshCw, ArrowLeft, Save } from 'lucide-react';
import {
  getStore,
  createStore,
  updateStore,
  getWarehouses,
  getShippingProviders,
  Store,
  StoreType,
} from '@/lib/api';

interface Warehouse {
  id: string;
  name: string;
}

interface ShippingProvider {
  id: string;
  name: string;
}

interface StoreDetailClientProps {
  storeId: string | null;
}

interface StoreFormData {
  name: string;
  brandName: string;
  type: StoreType;
  warehouseId: string;
  isActive: boolean;
  // API
  apiUrl: string;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  // Kargo
  shippingProviderId: string;
  // Senkronizasyon
  crawlIntervalMinutes: number;
  sendStock: boolean;
  sendPrice: boolean;
  sendOrderStatus: boolean;
  // Şirket
  brandCode: string;
  companyCode: string;
  branchCode: string;
  coCode: string;
  // Fatura Genel
  invoiceEnabled: boolean;
  invoiceTransactionCode: string;
  hasMicroExport: boolean;
  // E-Arşiv
  eArchiveBulkCustomer: boolean;
  eArchiveCardCode: string;
  eArchiveAccountCode: string;
  eArchiveSerialNo: string;
  eArchiveSequenceNo: string;
  eArchiveHavaleCardCode: string;
  eArchiveHavaleAccountCode: string;
  // E-Fatura
  eInvoiceBulkCustomer: boolean;
  eInvoiceCardCode: string;
  eInvoiceAccountCode: string;
  eInvoiceSerialNo: string;
  eInvoiceSequenceNo: string;
  eInvoiceHavaleCardCode: string;
  eInvoiceHavaleAccountCode: string;
  // Toplu Faturalama
  bulkEArchiveSerialNo: string;
  bulkEArchiveSequenceNo: string;
  bulkEInvoiceSerialNo: string;
  bulkEInvoiceSequenceNo: string;
  // İade Gider Pusulası
  refundExpenseVoucherEArchiveSerialNo: string;
  refundExpenseVoucherEArchiveSequenceNo: string;
  refundExpenseVoucherEInvoiceSerialNo: string;
  refundExpenseVoucherEInvoiceSequenceNo: string;
  // Mikro İhracat
  microExportTransactionCode: string;
  microExportAccountCode: string;
  microExportAzAccountCode: string;
  microExportEArchiveSerialNo: string;
  microExportEArchiveSequenceNo: string;
  microExportBulkSerialNo: string;
  microExportBulkSequenceNo: string;
  microExportRefundSerialNo: string;
  microExportRefundSequenceNo: string;
}

const defaultFormData: StoreFormData = {
  name: '',
  brandName: '',
  type: 'MANUAL',
  warehouseId: '',
  isActive: true,
  apiUrl: '',
  sellerId: '',
  apiKey: '',
  apiSecret: '',
  shippingProviderId: '',
  crawlIntervalMinutes: 15,
  sendStock: true,
  sendPrice: true,
  sendOrderStatus: true,
  brandCode: '',
  companyCode: '',
  branchCode: '',
  coCode: '',
  invoiceEnabled: false,
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
  eInvoiceHavaleCardCode: '',
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
};

export function StoreDetailClient({ storeId }: StoreDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [shippingProviders, setShippingProviders] = useState<ShippingProvider[]>([]);
  const [formData, setFormData] = useState<StoreFormData>(defaultFormData);
  const [existingStore, setExistingStore] = useState<Store | null>(null);

  const isNew = storeId === null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [warehouseRes, shippingRes] = await Promise.all([
        getWarehouses(1, 100),
        getShippingProviders(),
      ]);
      setWarehouses(warehouseRes.data || []);
      setShippingProviders(shippingRes || []);

      if (storeId) {
        const storeRes = await getStore(storeId);
        const store = storeRes.data;
        if (store) {
          setExistingStore(store);
          setFormData({
            name: store.name,
            brandName: store.brandName || '',
            type: store.type,
            warehouseId: store.warehouseId,
            isActive: store.isActive,
            apiUrl: store.apiUrl || '',
            sellerId: store.sellerId || '',
            apiKey: '',
            apiSecret: '',
            shippingProviderId: store.shippingProviderId || '',
            crawlIntervalMinutes: store.crawlIntervalMinutes || 15,
            sendStock: store.sendStock ?? true,
            sendPrice: store.sendPrice ?? true,
            sendOrderStatus: store.sendOrderStatus ?? true,
            brandCode: store.brandCode || '',
            companyCode: store.companyCode || '',
            branchCode: store.branchCode || '',
            coCode: store.coCode || '',
            invoiceEnabled: store.invoiceEnabled ?? false,
            invoiceTransactionCode: store.invoiceTransactionCode || '',
            hasMicroExport: store.hasMicroExport ?? false,
            eArchiveBulkCustomer: store.eArchiveBulkCustomer ?? false,
            eArchiveCardCode: store.eArchiveCardCode || '',
            eArchiveAccountCode: store.eArchiveAccountCode || '',
            eArchiveSerialNo: store.eArchiveSerialNo || '',
            eArchiveSequenceNo: store.eArchiveSequenceNo || '',
            eArchiveHavaleCardCode: store.eArchiveHavaleCardCode || '',
            eArchiveHavaleAccountCode: store.eArchiveHavaleAccountCode || '',
            eInvoiceBulkCustomer: store.eInvoiceBulkCustomer ?? false,
            eInvoiceCardCode: store.eInvoiceCardCode || '',
            eInvoiceAccountCode: store.eInvoiceAccountCode || '',
            eInvoiceSerialNo: store.eInvoiceSerialNo || '',
            eInvoiceSequenceNo: store.eInvoiceSequenceNo || '',
            eInvoiceHavaleCardCode: store.eInvoiceHavaleCardCode || '',
            eInvoiceHavaleAccountCode: store.eInvoiceHavaleAccountCode || '',
            bulkEArchiveSerialNo: store.bulkEArchiveSerialNo || '',
            bulkEArchiveSequenceNo: store.bulkEArchiveSequenceNo || '',
            bulkEInvoiceSerialNo: store.bulkEInvoiceSerialNo || '',
            bulkEInvoiceSequenceNo: store.bulkEInvoiceSequenceNo || '',
            refundExpenseVoucherEArchiveSerialNo: store.refundExpenseVoucherEArchiveSerialNo || '',
            refundExpenseVoucherEArchiveSequenceNo: store.refundExpenseVoucherEArchiveSequenceNo || '',
            refundExpenseVoucherEInvoiceSerialNo: store.refundExpenseVoucherEInvoiceSerialNo || '',
            refundExpenseVoucherEInvoiceSequenceNo: store.refundExpenseVoucherEInvoiceSequenceNo || '',
            microExportTransactionCode: store.microExportTransactionCode || '',
            microExportAccountCode: store.microExportAccountCode || '',
            microExportAzAccountCode: store.microExportAzAccountCode || '',
            microExportEArchiveSerialNo: store.microExportEArchiveSerialNo || '',
            microExportEArchiveSequenceNo: store.microExportEArchiveSequenceNo || '',
            microExportBulkSerialNo: store.microExportBulkSerialNo || '',
            microExportBulkSequenceNo: store.microExportBulkSequenceNo || '',
            microExportRefundSerialNo: store.microExportRefundSerialNo || '',
            microExportRefundSequenceNo: store.microExportRefundSequenceNo || '',
          });
        }
      }
    } catch {
      toast({ variant: 'destructive', title: 'Hata', description: 'Veriler yüklenemedi' });
    } finally {
      setLoading(false);
    }
  }, [storeId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.brandName || !formData.warehouseId) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Mağaza adı, marka adı ve depo zorunludur' });
      return;
    }

    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submitData: Record<string, any> = {
        name: formData.name,
        brandName: formData.brandName,
        type: formData.type,
        warehouseId: formData.warehouseId,
        isActive: formData.isActive,
        shippingProviderId: formData.shippingProviderId || null,
      };

      // API & Senkronizasyon (sadece marketplace için)
      if (formData.type !== 'MANUAL') {
        submitData.apiUrl = formData.apiUrl || null;
        submitData.sellerId = formData.sellerId || null;
        if (formData.apiKey) submitData.apiKey = formData.apiKey;
        if (formData.apiSecret) submitData.apiSecret = formData.apiSecret;
        submitData.crawlIntervalMinutes = formData.crawlIntervalMinutes;
        submitData.sendStock = formData.sendStock;
        submitData.sendPrice = formData.sendPrice;
        submitData.sendOrderStatus = formData.sendOrderStatus;
      }

      // Fatura Ayarları
      submitData.invoiceEnabled = formData.invoiceEnabled;
      
      if (formData.invoiceEnabled) {
        // Şirket Konfigürasyonu
        submitData.brandCode = formData.brandCode || null;
        submitData.companyCode = formData.companyCode || null;
        submitData.branchCode = formData.branchCode || null;
        submitData.coCode = formData.coCode || null;
        submitData.invoiceTransactionCode = formData.invoiceTransactionCode || null;

        // E-Arşiv
        submitData.eArchiveBulkCustomer = formData.eArchiveBulkCustomer;
        submitData.eArchiveCardCode = formData.eArchiveCardCode || null;
        submitData.eArchiveAccountCode = formData.eArchiveAccountCode || null;
        submitData.eArchiveSerialNo = formData.eArchiveSerialNo || null;
        submitData.eArchiveSequenceNo = formData.eArchiveSequenceNo || null;
        submitData.eArchiveHavaleCardCode = formData.eArchiveHavaleCardCode || null;
        submitData.eArchiveHavaleAccountCode = formData.eArchiveHavaleAccountCode || null;

        // E-Fatura
        submitData.eInvoiceBulkCustomer = formData.eInvoiceBulkCustomer;
        submitData.eInvoiceCardCode = formData.eInvoiceCardCode || null;
        submitData.eInvoiceAccountCode = formData.eInvoiceAccountCode || null;
        submitData.eInvoiceSerialNo = formData.eInvoiceSerialNo || null;
        submitData.eInvoiceSequenceNo = formData.eInvoiceSequenceNo || null;
        submitData.eInvoiceHavaleAccountCode = formData.eInvoiceHavaleAccountCode || null;

        // Toplu Faturalama
        submitData.bulkEArchiveSerialNo = formData.bulkEArchiveSerialNo || null;
        submitData.bulkEArchiveSequenceNo = formData.bulkEArchiveSequenceNo || null;
        submitData.bulkEInvoiceSerialNo = formData.bulkEInvoiceSerialNo || null;
        submitData.bulkEInvoiceSequenceNo = formData.bulkEInvoiceSequenceNo || null;

        // İade Gider Pusulası
        submitData.refundExpenseVoucherEArchiveSerialNo = formData.refundExpenseVoucherEArchiveSerialNo || null;
        submitData.refundExpenseVoucherEArchiveSequenceNo = formData.refundExpenseVoucherEArchiveSequenceNo || null;
        submitData.refundExpenseVoucherEInvoiceSerialNo = formData.refundExpenseVoucherEInvoiceSerialNo || null;
        submitData.refundExpenseVoucherEInvoiceSequenceNo = formData.refundExpenseVoucherEInvoiceSequenceNo || null;

        // Mikro İhracat (sadece Trendyol için)
        if (formData.type === 'TRENDYOL') {
          submitData.hasMicroExport = formData.hasMicroExport;
          if (formData.hasMicroExport) {
            submitData.microExportTransactionCode = formData.microExportTransactionCode || null;
            submitData.microExportAccountCode = formData.microExportAccountCode || null;
            submitData.microExportAzAccountCode = formData.microExportAzAccountCode || null;
            submitData.microExportEArchiveSerialNo = formData.microExportEArchiveSerialNo || null;
            submitData.microExportEArchiveSequenceNo = formData.microExportEArchiveSequenceNo || null;
            submitData.microExportBulkSerialNo = formData.microExportBulkSerialNo || null;
            submitData.microExportBulkSequenceNo = formData.microExportBulkSequenceNo || null;
            submitData.microExportRefundSerialNo = formData.microExportRefundSerialNo || null;
            submitData.microExportRefundSequenceNo = formData.microExportRefundSequenceNo || null;
          }
        } else {
          submitData.hasMicroExport = false;
        }
      }

      if (isNew) {
        await createStore(submitData);
        toast({ title: 'Başarılı', description: 'Mağaza oluşturuldu', variant: 'success' });
      } else {
        await updateStore(storeId!, submitData);
        toast({ title: 'Başarılı', description: 'Mağaza güncellendi', variant: 'success' });
      }
      router.push('/stores');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'İşlem başarısız';
      toast({ variant: 'destructive', title: 'Hata', description: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
    
      <div className="flex items-center justify-between">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/stores">Mağazalar</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{isNew ? 'Yeni Mağaza' : formData.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {isNew ? 'Oluştur' : 'Kaydet'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <StoreIcon className="w-4 h-4" /> Genel
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2" disabled={formData.type === 'MANUAL'}>
            <Settings className="w-4 h-4" /> API
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2" disabled={formData.type === 'MANUAL'}>
            <RefreshCw className="w-4 h-4" /> Senkronizasyon
          </TabsTrigger>
          <TabsTrigger value="invoice" className="flex items-center gap-2">
            <FileText className="w-4 h-4" /> Fatura
          </TabsTrigger>
        </TabsList>

        {/* GENEL TAB */}
        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Temel Bilgiler</CardTitle>
              <CardDescription>Mağazanın temel ayarlarını yapılandırın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Mağaza Adı *</Label>
                  <Input
                    placeholder="Örn: Embeauty Trendyol"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marka Adı *</Label>
                  <Input
                    placeholder="Örn: Embeauty"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Mağaza Tipi *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: StoreType) => setFormData({ ...formData, type: value, hasMicroExport: value !== 'TRENDYOL' ? false : formData.hasMicroExport })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tip seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRENDYOL">Trendyol</SelectItem>
                      <SelectItem value="HEPSIBURADA">Hepsiburada</SelectItem>
                      <SelectItem value="IKAS">İkas</SelectItem>
                      <SelectItem value="MANUAL">Manuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Varsayılan Depo *</Label>
                  <Select
                    value={formData.warehouseId}
                    onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Depo seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Kargo Sağlayıcısı</Label>
                  <Select
                    value={formData.shippingProviderId || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, shippingProviderId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kargo seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seçilmedi</SelectItem>
                      {(shippingProviders || []).map((sp) => (
                        <SelectItem key={sp.id} value={sp.id}>{sp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Durum</Label>
                  <Select
                    value={formData.isActive ? 'active' : 'passive'}
                    onValueChange={(value) => setFormData({ ...formData, isActive: value === 'active' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Aktif</SelectItem>
                      <SelectItem value="passive">Pasif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API TAB */}
        <TabsContent value="api" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>API Ayarları</CardTitle>
              <CardDescription>Pazaryeri API bağlantı bilgilerini girin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.type === 'MANUAL' ? (
                <div className="text-center text-muted-foreground py-8">
                  Manuel mağazalar için API ayarları gerekli değildir.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>API URL</Label>
                    <Input
                      placeholder="https://api.trendyol.com/..."
                      value={formData.apiUrl}
                      onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Satıcı ID (Seller ID)</Label>
                    <Input
                      placeholder="12345"
                      value={formData.sellerId}
                      onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>API Key {existingStore?.hasApiKey && <span className="text-xs text-muted-foreground">(kayıtlı)</span>}</Label>
                      <Input
                        type="password"
                        placeholder={existingStore?.hasApiKey ? '••••••••' : 'API Key girin'}
                        value={formData.apiKey}
                        onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>API Secret {existingStore?.hasApiSecret && <span className="text-xs text-muted-foreground">(kayıtlı)</span>}</Label>
                      <Input
                        type="password"
                        placeholder={existingStore?.hasApiSecret ? '••••••••' : 'API Secret girin'}
                        value={formData.apiSecret}
                        onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SENKRONİZASYON TAB */}
        <TabsContent value="sync" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Senkronizasyon Ayarları</CardTitle>
              <CardDescription>Stok, fiyat ve sipariş durumu senkronizasyonunu yapılandırın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {formData.type === 'MANUAL' ? (
                <div className="text-center text-muted-foreground py-8">
                  Manuel mağazalar için senkronizasyon ayarları gerekli değildir.
                </div>
              ) : (
                <>
                  <div className="space-y-2 max-w-xs">
                    <Label>Senkronizasyon Aralığı (dakika)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.crawlIntervalMinutes}
                      onChange={(e) => setFormData({ ...formData, crawlIntervalMinutes: parseInt(e.target.value) || 15 })}
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Stok Gönder</Label>
                        <p className="text-sm text-muted-foreground">Stok değişikliklerini pazaryerine gönder</p>
                      </div>
                      <Switch
                        checked={formData.sendStock}
                        onCheckedChange={(checked) => setFormData({ ...formData, sendStock: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Fiyat Gönder</Label>
                        <p className="text-sm text-muted-foreground">Fiyat değişikliklerini pazaryerine gönder</p>
                      </div>
                      <Switch
                        checked={formData.sendPrice}
                        onCheckedChange={(checked) => setFormData({ ...formData, sendPrice: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Sipariş Durumu Gönder</Label>
                        <p className="text-sm text-muted-foreground">Sipariş durumu değişikliklerini pazaryerine gönder</p>
                      </div>
                      <Switch
                        checked={formData.sendOrderStatus}
                        onCheckedChange={(checked) => setFormData({ ...formData, sendOrderStatus: checked })}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FATURA TAB */}
        <TabsContent value="invoice" className="mt-6 space-y-6">
          {/* Ana Fatura Açma/Kapama */}
          <Card>
            <CardHeader>
              <CardTitle>Fatura Ayarları</CardTitle>
              <CardDescription>Otomatik fatura oluşturma ayarlarını yapılandırın</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Faturalama Aktif</Label>
                  <p className="text-sm text-muted-foreground">Bu mağaza için otomatik fatura oluştur</p>
                </div>
                <Switch
                  checked={formData.invoiceEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, invoiceEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {formData.invoiceEnabled && (
            <>
              {/* Şirket Konfigürasyonu */}
              <Card>
                <CardHeader>
                  <CardTitle>Şirket Konfigürasyonu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Marka Kodu</Label>
                      <Input
                        placeholder="EMB"
                        value={formData.brandCode}
                        onChange={(e) => setFormData({ ...formData, brandCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Şirket Kodu</Label>
                      <Input
                        placeholder="001"
                        value={formData.companyCode}
                        onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Şube Kodu</Label>
                      <Input
                        placeholder="01"
                        value={formData.branchCode}
                        onChange={(e) => setFormData({ ...formData, branchCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CO Kodu</Label>
                      <Input
                        placeholder="TY"
                        value={formData.coCode}
                        onChange={(e) => setFormData({ ...formData, coCode: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="mt-4 max-w-xs">
                    <div className="space-y-2">
                      <Label>İşlem Kodu</Label>
                      <Input
                        placeholder="SATIS"
                        value={formData.invoiceTransactionCode}
                        onChange={(e) => setFormData({ ...formData, invoiceTransactionCode: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* E-Arşiv Ayarları */}
              <Card>
                <CardHeader>
                  <CardTitle>E-Arşiv Ayarları</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kart Kodu</Label>
                      <Input
                        value={formData.eArchiveCardCode}
                        onChange={(e) => setFormData({ ...formData, eArchiveCardCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hesap Kodu</Label>
                      <Input
                        value={formData.eArchiveAccountCode}
                        onChange={(e) => setFormData({ ...formData, eArchiveAccountCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Seri No</Label>
                      <Input
                        value={formData.eArchiveSerialNo}
                        onChange={(e) => setFormData({ ...formData, eArchiveSerialNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sıra No</Label>
                      <Input
                        value={formData.eArchiveSequenceNo}
                        onChange={(e) => setFormData({ ...formData, eArchiveSequenceNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Havale Kart Kodu</Label>
                      <Input
                        value={formData.eArchiveHavaleCardCode}
                        onChange={(e) => setFormData({ ...formData, eArchiveHavaleCardCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Havale Hesap Kodu</Label>
                      <Input
                        value={formData.eArchiveHavaleAccountCode}
                        onChange={(e) => setFormData({ ...formData, eArchiveHavaleAccountCode: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* E-Fatura Ayarları */}
              <Card>
                <CardHeader>
                  <CardTitle>E-Fatura Ayarları</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kart Kodu</Label>
                      <Input
                        value={formData.eInvoiceCardCode}
                        onChange={(e) => setFormData({ ...formData, eInvoiceCardCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Hesap Kodu</Label>
                      <Input
                        value={formData.eInvoiceAccountCode}
                        onChange={(e) => setFormData({ ...formData, eInvoiceAccountCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Seri No</Label>
                      <Input
                        value={formData.eInvoiceSerialNo}
                        onChange={(e) => setFormData({ ...formData, eInvoiceSerialNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sıra No</Label>
                      <Input
                        value={formData.eInvoiceSequenceNo}
                        onChange={(e) => setFormData({ ...formData, eInvoiceSequenceNo: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Havale Hesap Kodu</Label>
                      <Input
                        value={formData.eInvoiceHavaleAccountCode}
                        onChange={(e) => setFormData({ ...formData, eInvoiceHavaleAccountCode: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Toplu Faturalama Ayarları */}
              <Card>
                <CardHeader>
                  <CardTitle>Toplu Faturalama Ayarları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>E-Arşiv Seri No</Label>
                      <Input
                        value={formData.bulkEArchiveSerialNo}
                        onChange={(e) => setFormData({ ...formData, bulkEArchiveSerialNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-Arşiv Sıra No</Label>
                      <Input
                        value={formData.bulkEArchiveSequenceNo}
                        onChange={(e) => setFormData({ ...formData, bulkEArchiveSequenceNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-Fatura Seri No</Label>
                      <Input
                        value={formData.bulkEInvoiceSerialNo}
                        onChange={(e) => setFormData({ ...formData, bulkEInvoiceSerialNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-Fatura Sıra No</Label>
                      <Input
                        value={formData.bulkEInvoiceSequenceNo}
                        onChange={(e) => setFormData({ ...formData, bulkEInvoiceSequenceNo: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* İade Gider Pusulası Ayarları */}
              <Card>
                <CardHeader>
                  <CardTitle>İade Gider Pusulası Ayarları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>E-Arşiv Seri No</Label>
                      <Input
                        value={formData.refundExpenseVoucherEArchiveSerialNo}
                        onChange={(e) => setFormData({ ...formData, refundExpenseVoucherEArchiveSerialNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-Arşiv Sıra No</Label>
                      <Input
                        value={formData.refundExpenseVoucherEArchiveSequenceNo}
                        onChange={(e) => setFormData({ ...formData, refundExpenseVoucherEArchiveSequenceNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-Fatura Seri No</Label>
                      <Input
                        value={formData.refundExpenseVoucherEInvoiceSerialNo}
                        onChange={(e) => setFormData({ ...formData, refundExpenseVoucherEInvoiceSerialNo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>E-Fatura Sıra No</Label>
                      <Input
                        value={formData.refundExpenseVoucherEInvoiceSequenceNo}
                        onChange={(e) => setFormData({ ...formData, refundExpenseVoucherEInvoiceSequenceNo: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Mikro İhracat Ayarları (Sadece Trendyol) */}
              {formData.type === 'TRENDYOL' && (
                <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-amber-800 dark:text-amber-200">Mikro İhracat Ayarları</CardTitle>
                        <CardDescription>ETGB kapsamında mikro ihracat faturası (sadece Trendyol)</CardDescription>
                      </div>
                      <Switch
                        checked={formData.hasMicroExport}
                        onCheckedChange={(checked) => setFormData({ ...formData, hasMicroExport: checked })}
                      />
                    </div>
                  </CardHeader>
                  {formData.hasMicroExport && (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>İşlem Kodu</Label>
                          <Input
                            placeholder="MIKRO_IHRACAT"
                            value={formData.microExportTransactionCode}
                            onChange={(e) => setFormData({ ...formData, microExportTransactionCode: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Hesap Kodu</Label>
                          <Input
                            value={formData.microExportAccountCode}
                            onChange={(e) => setFormData({ ...formData, microExportAccountCode: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>AZ Hesap Kodu</Label>
                          <Input
                            value={formData.microExportAzAccountCode}
                            onChange={(e) => setFormData({ ...formData, microExportAzAccountCode: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label>E-Arşiv Seri No</Label>
                          <Input
                            value={formData.microExportEArchiveSerialNo}
                            onChange={(e) => setFormData({ ...formData, microExportEArchiveSerialNo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>E-Arşiv Sıra No</Label>
                          <Input
                            value={formData.microExportEArchiveSequenceNo}
                            onChange={(e) => setFormData({ ...formData, microExportEArchiveSequenceNo: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label>Toplu Seri No</Label>
                          <Input
                            value={formData.microExportBulkSerialNo}
                            onChange={(e) => setFormData({ ...formData, microExportBulkSerialNo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Toplu Sıra No</Label>
                          <Input
                            value={formData.microExportBulkSequenceNo}
                            onChange={(e) => setFormData({ ...formData, microExportBulkSequenceNo: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-2">
                          <Label>İade Seri No</Label>
                          <Input
                            value={formData.microExportRefundSerialNo}
                            onChange={(e) => setFormData({ ...formData, microExportRefundSerialNo: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>İade Sıra No</Label>
                          <Input
                            value={formData.microExportRefundSequenceNo}
                            onChange={(e) => setFormData({ ...formData, microExportRefundSequenceNo: e.target.value })}
                          />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
