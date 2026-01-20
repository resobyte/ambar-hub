'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getConsumables,
    createConsumable,
    updateConsumable,
    deleteConsumable,
    Consumable,
    ConsumableType,
    ConsumableUnit
} from '@/lib/api';
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

export default function ConsumablesPage() {
    const { toast } = useToast();
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [loading, setLoading] = useState(true);

    // Pagination
    const { page, pageSize, setPage, setPageSize } = useTableQuery({
        defaultPage: 1,
        defaultPageSize: 10,
    });

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingConsumable, setEditingConsumable] = useState<Consumable | null>(null);
    const [deletingConsumableId, setDeletingConsumableId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        type: ConsumableType.BOX,
        unit: ConsumableUnit.COUNT,
        minStockLevel: 10,
    });

    const fetchConsumables = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getConsumables();
            setConsumables(res.data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Sarf malzemeler yüklenemedi' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchConsumables(); }, [fetchConsumables]);

    const handleCreate = () => {
        setEditingConsumable(null);
        setFormData({
            name: '',
            sku: '',
            type: ConsumableType.BOX,
            unit: ConsumableUnit.COUNT,
            minStockLevel: 10,
        });
        setIsModalOpen(true);
    };

    const handleEdit = (consumable: Consumable) => {
        setEditingConsumable(consumable);
        setFormData({
            name: consumable.name,
            sku: consumable.sku,
            type: consumable.type,
            unit: consumable.unit,
            minStockLevel: consumable.minStockLevel,
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeletingConsumableId(id);
        setIsDeleteOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (!formData.name || !formData.sku) {
                toast({ variant: 'destructive', title: 'Hata', description: 'İsim ve SKU zorunludur' });
                return;
            }

            if (editingConsumable) {
                await updateConsumable(editingConsumable.id, formData);
                toast({ title: 'Başarılı', description: 'Sarf malzeme güncellendi', variant: 'success' });
            } else {
                await createConsumable(formData);
                toast({ title: 'Başarılı', description: 'Sarf malzeme oluşturuldu', variant: 'success' });
            }
            setIsModalOpen(false);
            fetchConsumables();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: err.message || 'İşlem başarısız'
            });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingConsumableId) return;
        try {
            await deleteConsumable(deletingConsumableId);
            toast({ title: 'Başarılı', description: 'Sarf malzeme silindi', variant: 'success' });
            setIsDeleteOpen(false);
            fetchConsumables();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: err.message || 'Silme işlemi başarısız'
            });
        }
    };

    const typeLabels: Record<string, string> = {
        [ConsumableType.BOX]: 'Kutu',
        [ConsumableType.BAG]: 'Poşet',
    };

    const unitLabels: Record<string, string> = {
        [ConsumableUnit.COUNT]: 'Adet',
        [ConsumableUnit.METER]: 'Metre',
    };

    // Pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentConsumables = consumables.slice(startIndex, endIndex);
    const totalPages = Math.ceil(consumables.length / pageSize);

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center">
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" /> Yeni Ekle
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>SKU</TableHead>
                                <TableHead>Malzeme Adı</TableHead>
                                <TableHead>Tip</TableHead>
                                <TableHead>Birim</TableHead>
                                <TableHead>Stok</TableHead>
                                <TableHead>Ort. Maliyet</TableHead>
                                <TableHead>Kritik Sınır</TableHead>
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
                            ) : currentConsumables.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                        Henüz sarf malzeme bulunmuyor.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                currentConsumables.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{typeLabels[item.type] || item.type}</Badge>
                                        </TableCell>
                                        <TableCell>{unitLabels[item.unit] || item.unit}</TableCell>
                                        <TableCell>
                                            <span className={`font-mono font-bold ${Number(item.stockQuantity) <= Number(item.minStockLevel) ? 'text-destructive' : 'text-foreground'}`}>
                                                {Number(item.stockQuantity).toFixed(2)}
                                            </span>
                                        </TableCell>
                                        <TableCell>{Number(item.averageCost).toFixed(2)} ₺</TableCell>
                                        <TableCell>{item.minStockLevel}</TableCell>
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
                totalItems={consumables.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
            />

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingConsumable ? 'Malzemeyi Düzenle' : 'Yeni Sarf Malzeme Ekle'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>SKU (Stok Kodu)</Label>
                            <Input
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                placeholder="Örn: KUTU-01"
                                disabled={!!editingConsumable} // SKU usually unique and fixed
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Malzeme Adı</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Malzeme adı girin"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tip</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value as ConsumableType })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(typeLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Birim</Label>
                                <Select
                                    value={formData.unit}
                                    onValueChange={(value) => setFormData({ ...formData, unit: value as ConsumableUnit })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(unitLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Kritik Stok Sınırı</Label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.minStockLevel}
                                onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
                        <Button onClick={handleSubmit}>
                            {editingConsumable ? 'Güncelle' : 'Oluştur'}
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
