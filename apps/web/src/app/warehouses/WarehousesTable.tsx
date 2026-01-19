'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Card, CardContent } from '@/components/ui/card';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useTableQuery } from '@/hooks/use-table-query';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Pencil, Trash2, Plus } from 'lucide-react';

interface WarehouseType {
  id: string;
  name: string;
  address: string | null;
  storeCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseFormData {
  name: string;
  address?: string;
  isActive: boolean;
}

export function WarehousesTable() {
  // URL-synced table query state
  const { page, pageSize, setPage, setPageSize } = useTableQuery({
    defaultPage: 1,
    defaultPageSize: 10,
  });

  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);
  const [deletingWarehouseId, setDeletingWarehouseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WarehouseFormData>({ name: '', address: '', isActive: true });
  const { toast } = useToast();

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getWarehouses(page, pageSize);
      setWarehouses(response.data);
      setTotal(response.meta.total);
      setTotalPages(Math.ceil(response.meta.total / pageSize));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Hata', description: 'Depolar yüklenemedi' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, toast]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleCreate = () => {
    setEditingWarehouse(null);
    setFormData({ name: '', address: '', isActive: true });
    setIsModalOpen(true);
  };

  const handleEdit = (warehouse: WarehouseType) => {
    setEditingWarehouse(warehouse);
    setFormData({ name: warehouse.name, address: warehouse.address || '', isActive: warehouse.isActive });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingWarehouseId(id);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, formData);
        toast({ variant: 'success', title: 'Başarılı', description: 'Depo başarıyla güncellendi' });
      } else {
        await createWarehouse(formData);
        toast({ variant: 'success', title: 'Başarılı', description: 'Depo başarıyla oluşturuldu' });
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Hata', description: err.message || 'İşlem başarısız' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingWarehouseId) return;
    try {
      await deleteWarehouse(deletingWarehouseId);
      toast({ variant: 'success', title: 'Başarılı', description: 'Depo başarıyla silindi' });
      setIsDeleteModalOpen(false);
      fetchWarehouses();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Hata', description: err.message || 'Silme işlemi başarısız' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Depolar</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Depo Ekle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ad</TableHead>
                <TableHead>Mağazalar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : warehouses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Henüz depo yok. Başlamak için ilk deponuzu oluşturun.
                  </TableCell>
                </TableRow>
              ) : (
                warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-medium">{warehouse.name}</TableCell>
                    <TableCell className="text-muted-foreground">{warehouse.storeCount}</TableCell>
                    <TableCell>
                      <Badge variant={warehouse.isActive ? 'default' : 'secondary'}
                        className={warehouse.isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}>
                        {warehouse.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(warehouse)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(warehouse.id)}
                          disabled={warehouse.storeCount > 0}
                          title={warehouse.storeCount > 0 ? 'Silinemez: Bağlı mağazalar var' : 'Sil'}
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? 'Depo Düzenle' : 'Depo Ekle'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Ad</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Depo adı girin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Depo adresi girin (opsiyonel)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Durum</Label>
              <Select
                value={formData.isActive ? 'active' : 'passive'}
                onValueChange={(v) => setFormData({ ...formData, isActive: v === 'active' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="passive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={!formData.name.trim()}>
                {editingWarehouse ? 'Güncelle' : 'Oluştur'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Depo Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu depoyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
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
