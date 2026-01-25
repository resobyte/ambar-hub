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
import { Card, CardContent } from '@/components/ui/card';
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
import { Loader2, Plus, Pencil, Trash2, Truck } from 'lucide-react';
import {
  getShippingProviders,
  createShippingProvider,
  updateShippingProvider,
  deleteShippingProvider,
  ShippingProvider,
} from '@/lib/api';

interface ShippingFormData {
  name: string;
  type: 'ARAS';
  isActive: boolean;
}

const SHIPPING_TYPES = [
  { value: 'ARAS', label: 'ARAS' },
];

export function ShippingTable() {
  const { toast } = useToast();
  const [providers, setProviders] = useState<ShippingProvider[]>([]);
  const [loading, setLoading] = useState(true);

  // Note: getShippingProviders typically returns all items, so we might simulate pagination or handle it if API supports it.
  // Based on previous file, it seemed to return array directly. We'll stick to client-side pagination if needed or just display all.
  // However, for consistency with StoresTable, let's assume we want to use the hook, even if we paginate client-side for now or if the API is updated later.
  // Actually, looking at previous code: `getShippingProviders()` took NO arguments and returned `data` array directly.
  // So we will fetch all and paginate client-side for now to match the UI pattern.

  const { page, pageSize, setPage, setPageSize } = useTableQuery({
    defaultPage: 1,
    defaultPageSize: 10,
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ShippingProvider | null>(null);
  const [deletingProviderId, setDeletingProviderId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ShippingFormData>({ name: '', type: 'ARAS', isActive: true });

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getShippingProviders();
      setProviders(data);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Kargo firmaları yüklenemedi' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleCreate = () => {
    setEditingProvider(null);
    setFormData({ name: '', type: 'ARAS', isActive: true });
    setIsModalOpen(true);
  };

  const handleEdit = (provider: ShippingProvider) => {
    setEditingProvider(provider);
    setFormData({
      name: provider.name,
      type: provider.type,
      isActive: provider.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingProviderId(id);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingProvider) {
        await updateShippingProvider(editingProvider.id, formData);
        toast({ title: 'Başarılı', description: 'Kargo firması güncellendi', variant: 'success' });
      } else {
        await createShippingProvider(formData);
        toast({ title: 'Başarılı', description: 'Kargo firması oluşturuldu', variant: 'success' });
      }
      setIsModalOpen(false);
      fetchProviders();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.message || 'İşlem başarısız'
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProviderId) return;
    try {
      await deleteShippingProvider(deletingProviderId);
      toast({ title: 'Başarılı', description: 'Kargo firması silindi', variant: 'success' });
      setIsDeleteOpen(false);
      fetchProviders();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.message || 'Silme işlemi başarısız'
      });
    }
  };

  // Client-side pagination logic since API returns all
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentProviders = providers.slice(startIndex, endIndex);
  const totalPages = Math.ceil(providers.length / pageSize);

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">AmbarHUB</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Kargo Firmaları</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-end items-center">
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" /> Kargo Ekle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Firma Adı</TableHead>
                <TableHead>Sağlayıcı</TableHead>
                <TableHead>Kullanım</TableHead>
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
              ) : currentProviders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Henüz kargo firması bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : (
                currentProviders.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        {provider.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {provider.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {provider.storeCount || 0} mağaza
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={provider.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                          : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                        }
                      >
                        {provider.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(provider)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(provider.id)}
                          disabled={(provider.storeCount || 0) > 0}
                          title={(provider.storeCount || 0) > 0 ? 'Mağazalar tarafından kullanılıyor' : 'Sil'}
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
        totalItems={providers.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'Kargo Firması Düzenle' : 'Yeni Kargo Firması Ekle'}</DialogTitle>
            <DialogDescription>
              Kargo entegrasyon bilgilerini aşağıdan yönetebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Firma Adı</Label>
              <Input
                placeholder="Örn: Aras Kargo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Sağlayıcı Tipi</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as 'ARAS' })}
                disabled={!!editingProvider}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sağlayıcı seçin" />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
              {editingProvider ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kargo firmasını silmek istiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu firmaya ait entegrasyon ayarları silinecektir.
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
