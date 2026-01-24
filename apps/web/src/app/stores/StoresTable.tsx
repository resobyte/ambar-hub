'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, Plus, Pencil, Trash2, Store as StoreIcon } from 'lucide-react';
import {
  getStores,
  deleteStore,
  Store,
  StoreType,
} from '@/lib/api';

const STORE_TYPE_LABELS: Record<StoreType, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  IKAS: 'İkas',
  MANUAL: 'Manuel',
};

const STORE_TYPE_COLORS: Record<StoreType, string> = {
  TRENDYOL: 'bg-orange-100 text-orange-800',
  HEPSIBURADA: 'bg-red-100 text-red-800',
  IKAS: 'bg-blue-100 text-blue-800',
  MANUAL: 'bg-gray-100 text-gray-800',
};

export function StoresTable() {
  const router = useRouter();
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const { page, pageSize, setPage, setPageSize } = useTableQuery({
    defaultPage: 1,
    defaultPageSize: 10,
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getStores(page, pageSize);
      setStores(response.data);
      setTotal(response.meta.total);
    } catch {
      toast({ variant: 'destructive', title: 'Hata', description: 'Mağazalar yüklenemedi' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, toast]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleCreate = () => {
    router.push('/stores/create');
  };

  const handleEdit = (store: Store) => {
    router.push(`/stores/${store.id}`);
  };

  const handleDelete = (id: string) => {
    setDeletingStoreId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStoreId) return;
    try {
      await deleteStore(deletingStoreId);
      toast({ title: 'Başarılı', description: 'Mağaza silindi', variant: 'success' });
      setIsDeleteOpen(false);
      fetchStores();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Silme işlemi başarısız';
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: message
      });
    }
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
                <TableHead>Marka</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Depo</TableHead>
                <TableHead>Kargo</TableHead>
                <TableHead>Fatura</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : stores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Henüz mağaza bulunmuyor.
                  </TableCell>
                </TableRow>
              ) : (
                stores.map((store) => (
                  <TableRow key={store.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(store)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <StoreIcon className="w-4 h-4 text-muted-foreground" />
                        {store.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{store.brandName || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STORE_TYPE_COLORS[store.type]}>
                        {STORE_TYPE_LABELS[store.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{store.warehouseName || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {store.shippingProviderName || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={store.invoiceEnabled
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                        }
                      >
                        {store.invoiceEnabled ? 'Aktif' : 'Pasif'}
                      </Badge>
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
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
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

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mağazayı silmek istiyor musunuz?</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Bu mağazaya ait tüm ayarlar ve bağlantılar silinecektir.
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
