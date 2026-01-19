'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBrands, createBrand, updateBrand, deleteBrand, Brand } from '@/lib/api';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { useTableQuery } from '@/hooks/use-table-query';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function BrandsPage() {
    const { toast } = useToast();
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination state
    const { page, pageSize, setPage, setPageSize } = useTableQuery({
        defaultPage: 1,
        defaultPageSize: 10,
    });

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({ name: '', isActive: true });

    const fetchBrands = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getBrands();
            setBrands(res.data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Markalar yüklenemedi' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchBrands(); }, [fetchBrands]);

    const handleCreate = () => {
        setEditingBrand(null);
        setFormData({ name: '', isActive: true });
        setIsModalOpen(true);
    };

    const handleEdit = (brand: Brand) => {
        setEditingBrand(brand);
        setFormData({ name: brand.name, isActive: brand.isActive });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeletingBrandId(id);
        setIsDeleteOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (editingBrand) {
                await updateBrand(editingBrand.id, formData);
                toast({ title: 'Başarılı', description: 'Marka güncellendi', variant: 'success' });
            } else {
                await createBrand(formData);
                toast({ title: 'Başarılı', description: 'Marka oluşturuldu', variant: 'success' });
            }
            setIsModalOpen(false);
            fetchBrands();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: err.message || 'İşlem başarısız'
            });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingBrandId) return;
        try {
            await deleteBrand(deletingBrandId);
            toast({ title: 'Başarılı', description: 'Marka silindi', variant: 'success' });
            setIsDeleteOpen(false);
            fetchBrands();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: err.message || 'Silme işlemi başarısız'
            });
        }
    };

    // Pagination Logic
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentBrands = brands.slice(startIndex, endIndex);
    const totalPages = Math.ceil(brands.length / pageSize);

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center">
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" /> Yeni Marka
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Marka Adı</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        <div className="flex justify-center items-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : currentBrands.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        Henüz marka bulunmuyor.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                currentBrands.map((brand) => (
                                    <TableRow key={brand.id}>
                                        <TableCell className="font-medium">{brand.name}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={brand.isActive
                                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                                }
                                            >
                                                {brand.isActive ? 'Aktif' : 'Pasif'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(brand)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDelete(brand.id)}
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
                totalItems={brands.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
            />

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBrand ? 'Markayı Düzenle' : 'Yeni Marka Ekle'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Marka Adı</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Marka adı girin"
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
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
                        <Button onClick={handleSubmit}>
                            {editingBrand ? 'Güncelle' : 'Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Markayı silmek istediğinize emin misiniz?</AlertDialogTitle>
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
