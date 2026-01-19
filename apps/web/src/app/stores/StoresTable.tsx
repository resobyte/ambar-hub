'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  DialogDescription,
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
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useTableQuery } from '@/hooks/use-table-query';
import { Loader2, Plus, Pencil, Trash2, Store as StoreIcon } from 'lucide-react';
import {
  getStores,
  createStore,
  updateStore,
  deleteStore,
  getWarehouses,
} from '@/lib/api';

interface Store {
  id: string;
  name: string;
  proxyUrl: string;
  warehouseId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface StoreFormData {
  name: string;
  proxyUrl: string;
  warehouseId: string;
  isActive: boolean;
}

export function StoresTable() {
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const { page, pageSize, setPage, setPageSize } = useTableQuery({
    defaultPage: 1,
    defaultPageSize: 10,
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StoreFormData>({ name: '', proxyUrl: '', warehouseId: '', isActive: true });

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getStores(page, pageSize);
      setStores(response.data);
      setTotal(response.meta.total);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Mağazalar yüklenemedi' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, toast]);

  const fetchWarehouses = useCallback(async () => {
    try {
      const response = await getWarehouses(1, 100);
      setWarehouses(response.data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Depolar yüklenemedi' });
    }
  }, [toast]);

  useEffect(() => {
    fetchStores();
    fetchWarehouses();
  }, [fetchStores, fetchWarehouses]);

  const handleCreate = () => {
    setEditingStore(null);
    setFormData({ name: '', proxyUrl: '', warehouseId: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      proxyUrl: store.proxyUrl,
      warehouseId: store.warehouseId,
      isActive: store.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingStoreId(id);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingStore) {
        await updateStore(editingStore.id, formData);
        toast({ title: 'Başarılı', description: 'Mağaza güncellendi', variant: 'success' });
      } else {
        await createStore(formData);
        toast({ title: 'Başarılı', description: 'Mağaza oluşturuldu', variant: 'success' });
      }
      setIsModalOpen(false);
      fetchStores();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.message || 'İşlem başarısız'
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStoreId) return;
    try {
      await deleteStore(deletingStoreId);
      toast({ title: 'Başarılı', description: 'Mağaza silindi', variant: 'success' });
      setIsDeleteOpen(false);
      fetchStores();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.message || 'Silme işlemi başarısız'
      });
    }
  };

  const getWarehouseName = (warehouseId: string) => {
    return warehouses.find(w => w.id === warehouseId)?.name || 'Bilinmiyor';
  };

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
            <BreadcrumbPage>Mağazalar</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-end items-center">
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" /> Mağaza Ekle
        </Button>
      </div>

      <Card>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mağaza Adı</TableHead>
                <TableHead>Depo</TableHead>
                <TableHead>Proxy URL</TableHead>
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
              ) : stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Henüz mağaza bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <StoreIcon className="w-4 h-4 text-muted-foreground" />
                        {store.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getWarehouseName(store.warehouseId)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">
                      {store.proxyUrl}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={store.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }
                      >
                        {store.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(store)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(store.id)}
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

      {/* Create/Edit Client Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStore ? 'Mağazayı Düzenle' : 'Yeni Mağaza Ekle'}</DialogTitle>
            <DialogDescription>
              Mağaza bilgilerini aşağıdan yönetebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mağaza Adı</Label>
              <Input
                placeholder="Örn: Trendyol Mağazam"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Proxy URL</Label>
              <Input
                placeholder="https://api.example.com"
                value={formData.proxyUrl}
                onChange={(e) => setFormData({ ...formData, proxyUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Varsayılan Depo</Label>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
            <Button onClick={handleSubmit}>
              {editingStore ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mağazayı silmek istiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu mağazaya bağlı tüm entegrasyon ayarları silinecektir.
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
