'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useTableQuery } from '@/hooks/use-table-query';
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  Search,
  Package,
  Store as StoreIcon,
  Link as LinkIcon,
  Save,
  List,
  Grid3X3,
  Check,
} from 'lucide-react';
import { getStores, getProducts, Store, Product } from '@/lib/api';

const API_URL = '/api';

interface ProductStore {
  id: string;
  productId: string;
  productName?: string;
  productBarcode?: string;
  productSku?: string;
  storeId: string;
  storeName?: string;
  storeType?: string;
  storeSku: string | null;
  storeBarcode: string | null;
  storeSalePrice: number | null;
  stockQuantity: number;
  sellableQuantity: number;
  reservableQuantity: number;
  committedQuantity: number;
  isActive: boolean;
}

interface ProductStoreFormData {
  productId: string;
  storeId: string;
  storeSku: string;
  storeBarcode: string;
  storeSalePrice: string;
  isActive: boolean;
}

interface BulkEditRow {
  productId: string;
  productName: string;
  productBarcode: string | null;
  storeBarcode: string;
  storeSku: string;
  storeSalePrice: string;
  isActive: boolean;
  hasChanges: boolean;
  existingId?: string;
}

const defaultFormData: ProductStoreFormData = {
  productId: '',
  storeId: '',
  storeSku: '',
  storeBarcode: '',
  storeSalePrice: '',
  isActive: true,
};

const STORE_TYPE_COLORS: Record<string, string> = {
  TRENDYOL: 'bg-orange-100 text-orange-800',
  HEPSIBURADA: 'bg-red-100 text-red-800',
  IKAS: 'bg-blue-100 text-blue-800',
  MANUAL: 'bg-gray-100 text-gray-800',
};

async function getProductStores(params: {
  page?: number;
  limit?: number;
  storeId?: string;
  search?: string;
}) {
  const url = new URL(`${API_URL}/product-stores`, window.location.origin);
  if (params.page) url.searchParams.set('page', String(params.page));
  if (params.limit) url.searchParams.set('limit', String(params.limit));
  if (params.storeId) url.searchParams.set('storeId', params.storeId);
  if (params.search) url.searchParams.set('search', params.search);
  
  const res = await fetch(url.toString(), { credentials: 'include' });
  return res.json();
}

async function createProductStore(data: Partial<ProductStore>) {
  const res = await fetch(`${API_URL}/product-stores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'İşlem başarısız');
  }
  return json;
}

async function updateProductStore(id: string, data: Partial<ProductStore>) {
  const res = await fetch(`${API_URL}/product-stores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'İşlem başarısız');
  }
  return json;
}

async function deleteProductStore(id: string) {
  const res = await fetch(`${API_URL}/product-stores/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || 'Silme başarısız');
  }
}

async function bulkUpsertProductStores(storeId: string, items: Array<{
  productId: string;
  storeBarcode?: string;
  storeSku?: string;
  storeSalePrice?: number;
  isActive?: boolean;
}>) {
  const res = await fetch(`${API_URL}/product-stores/bulk-upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ storeId, items }),
  });
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || 'Toplu kayıt başarısız');
  }
  return json.data;
}

export function ProductStoresClient() {
  const { toast } = useToast();
  const [productStores, setProductStores] = useState<ProductStore[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'bulk'>('list');

  // Bulk edit state
  const [bulkStoreId, setBulkStoreId] = useState<string>('');
  const [bulkRows, setBulkRows] = useState<BulkEditRow[]>([]);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const { page, pageSize, setPage, setPageSize } = useTableQuery({
    defaultPage: 1,
    defaultPageSize: 20,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductStore | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductStoreFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [psRes, storesRes, productsRes] = await Promise.all([
        getProductStores({
          page,
          limit: pageSize,
          storeId: storeFilter !== 'all' ? storeFilter : undefined,
          search: search || undefined,
        }),
        getStores(1, 100),
        getProducts(1, 1000),
      ]);
      
      const psData = psRes.data?.data || psRes.data || [];
      const psMeta = psRes.data?.meta || psRes.meta || {};
      
      setProductStores(Array.isArray(psData) ? psData : []);
      setTotal(psMeta.total || 0);
      setStores(storesRes.data || []);
      setProducts(productsRes.data || []);
    } catch {
      toast({ variant: 'destructive', title: 'Hata', description: 'Veriler yüklenemedi' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, storeFilter, search, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load bulk edit data when store is selected
  const loadBulkData = useCallback(async (storeId: string) => {
    if (!storeId || products.length === 0) {
      setBulkRows([]);
      return;
    }

    setBulkLoading(true);
    try {
      const psRes = await getProductStores({ storeId, limit: 1000 });
      const existingMappings = psRes.data?.data || psRes.data || [];
      const existingMap = new Map<string, ProductStore>();
      
      if (Array.isArray(existingMappings)) {
        existingMappings.forEach((ps: ProductStore) => {
          existingMap.set(ps.productId, ps);
        });
      }

      const rows: BulkEditRow[] = products.map((product) => {
        const existing = existingMap.get(product.id);
        return {
          productId: product.id,
          productName: product.name,
          productBarcode: product.barcode,
          // Eşleştirme varsa mevcut değerleri, yoksa ürünün kendi değerlerini kullan
          storeBarcode: existing?.storeBarcode || product.barcode || '',
          storeSku: existing?.storeSku || product.sku || '',
          storeSalePrice: existing?.storeSalePrice?.toString() || product.salePrice?.toString() || '',
          isActive: existing?.isActive ?? true,
          hasChanges: false,
          existingId: existing?.id,
        };
      });

      setBulkRows(rows);
    } catch {
      toast({ variant: 'destructive', title: 'Hata', description: 'Veriler yüklenemedi' });
    } finally {
      setBulkLoading(false);
    }
  }, [products, toast]);

  useEffect(() => {
    if (viewMode === 'bulk' && bulkStoreId && products.length > 0) {
      loadBulkData(bulkStoreId);
    }
  }, [viewMode, bulkStoreId, products.length, loadBulkData]);

  const handleCreate = () => {
    setEditingItem(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ProductStore) => {
    setEditingItem(item);
    setFormData({
      productId: item.productId,
      storeId: item.storeId,
      storeSku: item.storeSku || '',
      storeBarcode: item.storeBarcode || '',
      storeSalePrice: item.storeSalePrice?.toString() || '',
      isActive: item.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.productId || !formData.storeId) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Ürün ve mağaza seçimi zorunludur' });
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        productId: formData.productId,
        storeId: formData.storeId,
        storeSku: formData.storeSku || null,
        storeBarcode: formData.storeBarcode || null,
        storeSalePrice: formData.storeSalePrice ? parseFloat(formData.storeSalePrice) : null,
        isActive: formData.isActive,
      };

      if (editingItem) {
        await updateProductStore(editingItem.id, submitData);
        toast({ title: 'Başarılı', description: 'Eşleştirme güncellendi', variant: 'success' });
      } else {
        await createProductStore(submitData);
        toast({ title: 'Başarılı', description: 'Eşleştirme oluşturuldu', variant: 'success' });
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'İşlem başarısız';
      toast({ variant: 'destructive', title: 'Hata', description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteProductStore(deletingId);
      toast({ title: 'Başarılı', description: 'Eşleştirme silindi', variant: 'success' });
      setIsDeleteOpen(false);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Silme başarısız';
      toast({ variant: 'destructive', title: 'Hata', description: message });
    }
  };

  const updateBulkRow = (productId: string, field: keyof BulkEditRow, value: string | boolean) => {
    setBulkRows(prev => prev.map(row => {
      if (row.productId === productId) {
        return { ...row, [field]: value, hasChanges: true };
      }
      return row;
    }));
  };

  const handleBulkSave = async () => {
    if (!bulkStoreId) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Mağaza seçin' });
      return;
    }

    if (bulkRows.length === 0) {
      toast({ title: 'Bilgi', description: 'Kayıt edilecek ürün yok' });
      return;
    }

    setBulkSaving(true);
    try {
      const items = bulkRows.map(row => ({
        productId: row.productId,
        storeBarcode: row.storeBarcode || undefined,
        storeSku: row.storeSku || undefined,
        storeSalePrice: row.storeSalePrice ? parseFloat(row.storeSalePrice) : undefined,
        isActive: row.isActive,
      }));

      const result = await bulkUpsertProductStores(bulkStoreId, items);
      
      toast({ 
        title: 'Başarılı', 
        description: `${result.created} yeni, ${result.updated} güncelleme yapıldı`,
        variant: 'success'
      });

      // Reset hasChanges
      setBulkRows(prev => prev.map(row => ({ ...row, hasChanges: false })));
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Kayıt başarısız';
      toast({ variant: 'destructive', title: 'Hata', description: message });
    } finally {
      setBulkSaving(false);
    }
  };

  const filteredBulkRows = bulkRows.filter(row => {
    if (!bulkSearch) return true;
    const search = bulkSearch.toLowerCase();
    return (
      row.productName.toLowerCase().includes(search) ||
      row.productBarcode?.toLowerCase().includes(search) ||
      row.storeBarcode.toLowerCase().includes(search)
    );
  });

  const changedCount = bulkRows.filter(r => r.hasChanges).length;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Ürün-Mağaza Eşleştirme</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'bulk')}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="w-4 h-4" /> Liste
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" /> Toplu Düzenleme
            </TabsTrigger>
          </TabsList>

          {viewMode === 'list' && (
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" /> Yeni Eşleştirme
            </Button>
          )}
        </div>

        {/* LIST VIEW */}
        <TabsContent value="list" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Ürün adı, barkod ile ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Mağaza filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Mağazalar</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Ürün Barkod</TableHead>
                    <TableHead>Mağaza</TableHead>
                    <TableHead>Mağaza Barkod</TableHead>
                    <TableHead>Mağaza SKU</TableHead>
                    <TableHead className="text-right">Mağaza Fiyatı</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : productStores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <LinkIcon className="w-8 h-8 text-muted-foreground/50" />
                          <span>Henüz eşleştirme yok. Toplu düzenleme ile hızlıca ekleyin.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    productStores.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{item.productName || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {item.productBarcode || '-'}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StoreIcon className="w-4 h-4 text-muted-foreground" />
                            <span>{item.storeName || '-'}</span>
                            {item.storeType && (
                              <Badge variant="outline" className={STORE_TYPE_COLORS[item.storeType] || ''}>
                                {item.storeType}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.storeBarcode ? (
                            <code className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                              {item.storeBarcode}
                            </code>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {item.storeSku ? (
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              {item.storeSku}
                            </code>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.storeSalePrice !== null ? (
                            <span className="font-medium">{item.storeSalePrice.toFixed(2)} ₺</span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={item.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {item.isActive ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(item.id)}
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
            totalPages={totalPages}
            totalItems={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </TabsContent>

        {/* BULK EDIT VIEW */}
        <TabsContent value="bulk" className="mt-6 space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="w-5 h-5" />
                    Toplu Ürün-Mağaza Eşleştirme
                  </CardTitle>
                  <CardDescription>
                    Bir mağaza seçin ve tüm ürünler için barkod, SKU ve fiyat bilgilerini girin
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {changedCount > 0 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      {changedCount} değişiklik
                    </Badge>
                  )}
                  <Button onClick={handleBulkSave} disabled={bulkSaving || bulkRows.length === 0}>
                    {bulkSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Tümünü Kaydet
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="space-y-2 sm:w-[300px]">
                  <Label>Mağaza Seçin *</Label>
                  <Select value={bulkStoreId} onValueChange={setBulkStoreId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Mağaza seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          <div className="flex items-center gap-2">
                            {store.name}
                            <Badge variant="outline" className={STORE_TYPE_COLORS[store.type] || ''}>
                              {store.type}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {bulkStoreId && (
                  <div className="flex-1 space-y-2">
                    <Label>Ürün Ara</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Ürün adı veya barkod..."
                        value={bulkSearch}
                        onChange={(e) => setBulkSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                )}
              </div>

              {bulkStoreId && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[250px]">Ürün</TableHead>
                        <TableHead className="w-[130px]">Ürün Barkod</TableHead>
                        <TableHead className="w-[150px]">Mağaza Barkod</TableHead>
                        <TableHead className="w-[130px]">Mağaza SKU</TableHead>
                        <TableHead className="w-[120px]">Mağaza Fiyatı</TableHead>
                        <TableHead className="w-[80px] text-center">Aktif</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : filteredBulkRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                            {bulkRows.length === 0 ? 'Ürün bulunamadı' : 'Arama sonucu bulunamadı'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredBulkRows.map((row) => (
                          <TableRow key={row.productId} className={row.hasChanges ? 'bg-amber-50/50' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate" title={row.productName}>
                                  {row.productName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {row.productBarcode || '-'}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.storeBarcode}
                                onChange={(e) => updateBulkRow(row.productId, 'storeBarcode', e.target.value)}
                                placeholder="Mağaza barkod"
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={row.storeSku}
                                onChange={(e) => updateBulkRow(row.productId, 'storeSku', e.target.value)}
                                placeholder="SKU"
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={row.storeSalePrice}
                                onChange={(e) => updateBulkRow(row.productId, 'storeSalePrice', e.target.value)}
                                placeholder="0.00"
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={row.isActive}
                                onCheckedChange={(checked) => updateBulkRow(row.productId, 'isActive', checked)}
                              />
                            </TableCell>
                            <TableCell>
                              {row.hasChanges && (
                                <Check className="w-4 h-4 text-amber-600" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              {editingItem ? 'Eşleştirmeyi Düzenle' : 'Yeni Ürün-Mağaza Eşleştirmesi'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ürün *</Label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) => setFormData({ ...formData, productId: value })}
                  disabled={!!editingItem}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ürün seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} {product.barcode && `(${product.barcode})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mağaza *</Label>
                <Select
                  value={formData.storeId}
                  onValueChange={(value) => setFormData({ ...formData, storeId: value })}
                  disabled={!!editingItem}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Mağaza seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm text-muted-foreground">Mağaza Özel Bilgileri</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mağaza Barkodu</Label>
                  <Input
                    placeholder="Pazaryeri barkodu"
                    value={formData.storeBarcode}
                    onChange={(e) => setFormData({ ...formData, storeBarcode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mağaza SKU</Label>
                  <Input
                    placeholder="Pazaryeri SKU"
                    value={formData.storeSku}
                    onChange={(e) => setFormData({ ...formData, storeSku: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mağaza Satış Fiyatı (₺)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.storeSalePrice}
                onChange={(e) => setFormData({ ...formData, storeSalePrice: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <Label>Aktif</Label>
                <p className="text-sm text-muted-foreground">Bu eşleştirme aktif mi?</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eşleştirmeyi silmek istiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
