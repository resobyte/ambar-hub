'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  getIntegrationStores,
  createIntegrationStore,
  updateIntegrationStore,
  deleteIntegrationStore,
  getStores,
  getActiveShippingProviders,
} from '@/lib/api';

// ... Keep existing interfaces ...
interface Integration {
  id: string;
  name: string;
  type: 'TRENDYOL' | 'HEPSIBURADA' | 'IKAS';
  apiUrl: string;
  isActive: boolean;
  storeCount: number;
}

interface IntegrationStore {
  id: string;
  integrationId: string;
  storeId: string;
  storeName?: string;
  shippingProviderId: string | null;
  sellerId: string;
  apiKey: string;
  apiSecret: string;
  crawlIntervalMinutes: number;
  sendStock: boolean;
  sendPrice: boolean;
  sendOrderStatus: boolean;
  isActive: boolean;
  // ... other fields
  [key: string]: any;
}

interface Store {
  id: string;
  name: string;
}

interface ShippingProvider {
  id: string;
  name: string;
  type: 'ARAS';
  isActive: boolean;
}

interface IntegrationFormData {
  name: string;
  type: 'TRENDYOL' | 'HEPSIBURADA' | 'IKAS';
  apiUrl: string;
  isActive: boolean;
}

const INTEGRATION_TYPES = [
  { value: 'TRENDYOL', label: 'Trendyol' },
  { value: 'HEPSIBURADA', label: 'Hepsiburada' },
  { value: 'IKAS', label: 'Ikas' },
];

const DEFAULT_STORE_CONFIG = {
  crawlIntervalMinutes: 60,
  sendStock: true,
  sendPrice: true,
  sendOrderStatus: true,
  isActive: true,
  // ... other default fields
};

export function IntegrationsTable() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [integrationStores, setIntegrationStores] = useState<IntegrationStore[]>([]);
  const [shippingProviders, setShippingProviders] = useState<ShippingProvider[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination (client side for now or basic server side)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [deletingIntegrationId, setDeletingIntegrationId] = useState<string | null>(null);

  const [formData, setFormData] = useState<IntegrationFormData>({
    name: '',
    type: 'TRENDYOL',
    apiUrl: '',
    isActive: true,
  });

  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [storeConfigs, setStoreConfigs] = useState<Map<string, any>>(new Map());

  // Fetch Data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [intRes, storeRes, intStoreRes, shipRes] = await Promise.all([
        getIntegrations(page, pageSize),
        getStores(1, 100),
        getIntegrationStores(),
        getActiveShippingProviders()
      ]);

      setIntegrations(intRes.data);
      setTotal(intRes.meta.total);
      setStores(storeRes.data);
      setIntegrationStores(intStoreRes);
      setShippingProviders(shipRes);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Veriler yüklenemedi' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, toast]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleCreate = () => {
    setEditingIntegration(null);
    setFormData({ name: '', type: 'TRENDYOL', apiUrl: '', isActive: true });
    setSelectedStoreIds([]);
    setStoreConfigs(new Map());
    setIsModalOpen(true);
  };

  const handleEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      type: integration.type,
      apiUrl: integration.apiUrl,
      isActive: integration.isActive,
    });

    // Load existing store configs
    const existingConfigs = integrationStores.filter(is => is && is.integrationId === integration.id);
    const storeIds = existingConfigs.map(is => is.storeId);
    setSelectedStoreIds(storeIds);

    const configsMap = new Map();
    existingConfigs.forEach(is => {
      configsMap.set(is.storeId, { ...is });
    });
    setStoreConfigs(configsMap);

    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingIntegrationId(id);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    try {
      let integrationId: string;
      if (editingIntegration) {
        const res = await updateIntegration(editingIntegration.id, formData);
        integrationId = res.data.id;
        toast({ title: 'Başarılı', description: 'Entegrasyon güncellendi', variant: 'success' });
      } else {
        const res = await createIntegration(formData);
        integrationId = res.data.id;
        toast({ title: 'Başarılı', description: 'Entegrasyon oluşturuldu', variant: 'success' });
      }

      // Handle Store Configs
      const existingConfigs = integrationStores.filter(is => is && is.integrationId === (editingIntegration?.id || integrationId));
      const existingStoreIds = new Set(existingConfigs.map(is => is.storeId));

      for (const storeId of selectedStoreIds) {
        const config = storeConfigs.get(storeId);
        if (!config) continue;

        const existingConfig = existingConfigs.find(is => is.storeId === storeId);
        const payload = {
          ...config,
          integrationId,
          storeId,
          shippingProviderId: config.shippingProviderId || undefined,
        };

        if (existingConfig) {
          await updateIntegrationStore(existingConfig.id, payload);
        } else {
          await createIntegrationStore(payload);
        }
        existingStoreIds.delete(storeId);
      }

      // Delete removed stores
      for (const storeId of Array.from(existingStoreIds)) {
        const configToRemove = existingConfigs.find(is => is.storeId === storeId);
        if (configToRemove) await deleteIntegrationStore(configToRemove.id);
      }

      setIsModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Hata', description: err.message || 'İşlem başarısız' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingIntegrationId) return;
    try {
      await deleteIntegration(deletingIntegrationId);
      toast({ title: 'Başarılı', description: 'Entegrasyon silindi', variant: 'success' });
      setIsDeleteOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Silme işlemi başarısız' });
    }
  };

  const getTypeLabel = (type: string) => {
    return INTEGRATION_TYPES.find(t => t.value === type)?.label || type;
  };

  const handleStoreToggle = (storeId: string, checked: boolean) => {
    setSelectedStoreIds(prev => checked ? [...prev, storeId] : prev.filter(id => id !== storeId));
    if (checked && !storeConfigs.has(storeId)) {
      setStoreConfigs(prev => new Map(prev).set(storeId, { ...DEFAULT_STORE_CONFIG }));
    }
  };

  const updateStoreConfig = (storeId: string, field: string, value: any) => {
    setStoreConfigs(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(storeId) || { ...DEFAULT_STORE_CONFIG };
      newMap.set(storeId, { ...current, [field]: value });
      return newMap;
    });
  };

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Entegrasyonlar</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-end">
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" /> Entegrasyon Ekle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Mağazalar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : integrations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Entegrasyon bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                integrations.map((integration) => (
                  <TableRow key={integration.id}>
                    <TableCell className="font-medium">{integration.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {getTypeLabel(integration.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{integration.storeCount}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={integration.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }
                      >
                        {integration.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(integration)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(integration.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalPages={Math.ceil(total / pageSize)}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Create/Edit Modal - Full Width for Complex Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIntegration ? 'Entegrasyonu Düzenle' : 'Yeni Entegrasyon Ekle'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entegrasyon Adı</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEGRATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>API URL</Label>
              <Input
                value={formData.apiUrl}
                onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
              />
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

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Mağaza Bağlantıları</h3>
              <div className="grid gap-4">
                {stores.map(store => (
                  <Card key={store.id} className={selectedStoreIds.includes(store.id) ? 'border-primary' : ''}>
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                          id={`store-${store.id}`}
                          checked={selectedStoreIds.includes(store.id)}
                          onCheckedChange={(checked) => handleStoreToggle(store.id, checked as boolean)}
                        />
                        <Label htmlFor={`store-${store.id}`} className="font-medium">{store.name}</Label>
                      </div>

                      {selectedStoreIds.includes(store.id) && (
                        <div className="grid gap-4 pl-6 border-l-2 ml-1">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Satıcı ID (Seller ID)</Label>
                              <Input
                                value={storeConfigs.get(store.id)?.sellerId || ''}
                                onChange={(e) => updateStoreConfig(store.id, 'sellerId', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Kargo Firması</Label>
                              <Select
                                value={storeConfigs.get(store.id)?.shippingProviderId || ''}
                                onValueChange={(value) => updateStoreConfig(store.id, 'shippingProviderId', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                                <SelectContent>
                                  {shippingProviders.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>API Key</Label>
                              <Input
                                type="password"
                                value={storeConfigs.get(store.id)?.apiKey || ''}
                                onChange={(e) => updateStoreConfig(store.id, 'apiKey', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>API Secret</Label>
                              <Input
                                type="password"
                                value={storeConfigs.get(store.id)?.apiSecret || ''}
                                onChange={(e) => updateStoreConfig(store.id, 'apiSecret', e.target.value)}
                              />
                            </div>
                          </div>
                          {/* Other config fields as needed */}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit}>
              {editingIntegration ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Entegrasyonu silmek istediğinize emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
