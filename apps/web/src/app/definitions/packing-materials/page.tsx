'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPackingMaterials, createPackingMaterial, updatePackingMaterial, deletePackingMaterial, PackingMaterial, PackingMaterialType } from '@/lib/api';
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

export default function PackingMaterialsPage() {
    const { toast } = useToast();
    const [materials, setMaterials] = useState<PackingMaterial[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const { page, pageSize, setPage, setPageSize } = useTableQuery({
        defaultPage: 1,
        defaultPageSize: 10,
    });

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<PackingMaterial | null>(null);
    const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        type: PackingMaterialType.BOX,
        stockQuantity: 0,
        lowStockThreshold: 10,
        isActive: true
    });

    const fetchMaterials = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPackingMaterials();
            setMaterials(res.data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Malzemeler yüklenemedi' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

    const handleCreate = () => {
        setEditingMaterial(null);
        setFormData({
            name: '',
            type: PackingMaterialType.BOX,
            stockQuantity: 0,
            lowStockThreshold: 10,
            isActive: true
        });
        setIsModalOpen(true);
    };

    const handleEdit = (material: PackingMaterial) => {
        setEditingMaterial(material);
        setFormData({
            name: material.name,
            type: material.type,
            stockQuantity: material.stockQuantity,
            lowStockThreshold: material.lowStockThreshold,
            isActive: material.isActive
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeletingMaterialId(id);
        setIsDeleteOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (editingMaterial) {
                await updatePackingMaterial(editingMaterial.id, formData);
                toast({ title: 'Başarılı', description: 'Malzeme güncellendi', variant: 'success' });
            } else {
                await createPackingMaterial(formData);
                toast({ title: 'Başarılı', description: 'Malzeme oluşturuldu', variant: 'success' });
            }
            setIsModalOpen(false);
            fetchMaterials();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: err.message || 'İşlem başarısız'
            });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingMaterialId) return;
        try {
            await deletePackingMaterial(deletingMaterialId);
            toast({ title: 'Başarılı', description: 'Malzeme silindi', variant: 'success' });
            setIsDeleteOpen(false);
            fetchMaterials();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: err.message || 'Silme işlemi başarısız'
            });
        }
    };

    const typeLabels: Record<string, string> = {
        [PackingMaterialType.BOX]: 'Kutu',
        [PackingMaterialType.ENVELOPE]: 'Zarf',
        [PackingMaterialType.TAPE]: 'Bant',
        [PackingMaterialType.BUBBLE_WRAP]: 'Balonlu Naylon',
        [PackingMaterialType.OTHER]: 'Diğer',
    };

    const typeOptions = Object.keys(typeLabels).map(key => ({
        value: key,
        label: typeLabels[key]
    }));

    // Pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentMaterials = materials.slice(startIndex, endIndex);
    const totalPages = Math.ceil(materials.length / pageSize);

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center">
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" /> Malzeme Ekle
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Malzeme Adı</TableHead>
                                <TableHead>Tip</TableHead>
                                <TableHead>Stok</TableHead>
                                <TableHead>Kritik Sınır</TableHead>
                                <TableHead>Durum</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex justify-center items-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : currentMaterials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Henüz malzeme bulunmuyor.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                currentMaterials.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{typeLabels[item.type] || item.type}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`font-mono font-bold ${item.stockQuantity <= item.lowStockThreshold ? 'text-destructive' : 'text-foreground'}`}>
                                                {item.stockQuantity}
                                            </span>
                                        </TableCell>
                                        <TableCell>{item.lowStockThreshold}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={item.isActive
                                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                                }
                                            >
                                                {item.isActive ? 'Aktif' : 'Pasif'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(item)}
                                                >
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
                totalItems={materials.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
            />

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingMaterial ? 'Malzemeyi Düzenle' : 'Yeni Malzeme Ekle'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Malzeme Adı</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Malzeme adı girin"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tip</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value as PackingMaterialType })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {typeOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Stok Miktarı</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.stockQuantity}
                                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Kritik Stok Sınırı</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={formData.lowStockThreshold}
                                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                                />
                            </div>
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
                            {editingMaterial ? 'Güncelle' : 'Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Malzemeyi silmek istediğinize emin misiniz?</AlertDialogTitle>
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
