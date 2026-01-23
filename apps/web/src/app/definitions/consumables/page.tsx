'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Package, Layers, Barcode } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useToast } from '@/components/ui/use-toast';

interface FormData {
    name: string;
    sku: string;
    barcode: string;
    type: ConsumableType;
    unit: ConsumableUnit;
    minStockLevel: number;
    parentId: string;
    conversionQuantity: number;
}

interface GroupedConsumable {
    parent: Consumable;
    variants: Consumable[];
}

export default function ConsumablesPage() {
    const { toast } = useToast();
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingConsumable, setEditingConsumable] = useState<Consumable | null>(null);
    const [deletingConsumableId, setDeletingConsumableId] = useState<string | null>(null);

    const [formData, setFormData] = useState<FormData>({
        name: '',
        sku: '',
        barcode: '',
        type: ConsumableType.BOX,
        unit: ConsumableUnit.COUNT,
        minStockLevel: 10,
        parentId: '',
        conversionQuantity: 1,
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

    const parentConsumables = useMemo(() =>
        consumables.filter(c => !c.parentId),
        [consumables]
    );

    const groupedConsumables = useMemo(() => {
        const groups: GroupedConsumable[] = [];
        const parents = consumables.filter(c => !c.parentId);

        parents.forEach(parent => {
            const variants = consumables.filter(c => c.parentId === parent.id);
            if (
                parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (parent.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (parent.barcode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                variants.some(v =>
                    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (v.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (v.barcode || '').toLowerCase().includes(searchTerm.toLowerCase())
                )
            ) {
                groups.push({ parent, variants });
            }
        });

        return groups;
    }, [consumables, searchTerm]);

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleCreate = (parentId?: string) => {
        setEditingConsumable(null);
        const parent = parentId ? parentConsumables.find(p => p.id === parentId) : null;
        setFormData({
            name: '',
            sku: '',
            barcode: '',
            type: parent?.type || ConsumableType.BOX,
            unit: parent?.unit || ConsumableUnit.COUNT,
            minStockLevel: 10,
            parentId: parentId || '',
            conversionQuantity: 1,
        });
        setIsModalOpen(true);
    };

    const handleEdit = (consumable: Consumable) => {
        setEditingConsumable(consumable);
        setFormData({
            name: consumable.name,
            sku: consumable.sku || '',
            barcode: consumable.barcode || '',
            type: consumable.type,
            unit: consumable.unit,
            minStockLevel: consumable.minStockLevel,
            parentId: consumable.parentId || '',
            conversionQuantity: consumable.conversionQuantity || 1,
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeletingConsumableId(id);
        setIsDeleteOpen(true);
    };

    const handleSubmit = async () => {
        try {
            if (!formData.name) {
                toast({ variant: 'destructive', title: 'Hata', description: 'İsim zorunludur' });
                return;
            }

            const payload: any = {
                name: formData.name,
                type: formData.type,
                unit: formData.unit,
                minStockLevel: Number(formData.minStockLevel) || 0,
            };

            if (formData.sku) payload.sku = formData.sku;
            if (formData.barcode) payload.barcode = formData.barcode;
            if (formData.parentId) {
                payload.parentId = formData.parentId;
                payload.conversionQuantity = Number(formData.conversionQuantity) || 1;
            }

            if (editingConsumable) {
                await updateConsumable(editingConsumable.id, payload);
                toast({ title: 'Başarılı', description: 'Sarf malzeme güncellendi', variant: 'success' });
            } else {
                await createConsumable(payload);
                toast({ title: 'Başarılı', description: 'Sarf malzeme oluşturuldu', variant: 'success' });
                if (formData.parentId) {
                    setExpandedIds(prev => new Set(prev).add(formData.parentId));
                }
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
        [ConsumableType.TAPE]: 'Bant',
        [ConsumableType.LABEL]: 'Etiket',
        [ConsumableType.OTHER]: 'Diğer',
    };

    const unitLabels: Record<string, string> = {
        [ConsumableUnit.COUNT]: 'Adet',
        [ConsumableUnit.METER]: 'Metre',
        [ConsumableUnit.KILOGRAM]: 'Kilogram',
    };

    const isVariant = !!formData.parentId;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <Input
                    placeholder="Ara (isim, SKU, barkod)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:max-w-xs"
                />
                <Button onClick={() => handleCreate()} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Yeni Ana Malzeme
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : groupedConsumables.length === 0 ? (
                        <div className="py-12 text-center">
                            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                            <p className="text-muted-foreground">Henüz sarf malzeme bulunmuyor.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead>Malzeme</TableHead>
                                    <TableHead>Tip</TableHead>
                                    <TableHead>SKU / Barkod</TableHead>
                                    <TableHead className="text-right">Stok</TableHead>
                                    <TableHead className="text-right">Maliyet</TableHead>
                                    <TableHead className="text-right w-36">İşlemler</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedConsumables.map(({ parent, variants }) => {
                                    const isExpanded = expandedIds.has(parent.id);
                                    const hasVariants = variants.length > 0;
                                    const isLowStock = Number(parent.stockQuantity) <= Number(parent.minStockLevel);

                                    return (
                                        <>
                                            <TableRow key={parent.id} className="bg-card">
                                                <TableCell className="w-10">
                                                    {hasVariants ? (
                                                        <button
                                                            onClick={() => toggleExpand(parent.id)}
                                                            className="p-1 hover:bg-muted rounded transition-colors"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                            )}
                                                        </button>
                                                    ) : null}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{parent.name}</span>
                                                        {hasVariants && (
                                                            <Badge variant="secondary" className="gap-1 text-xs">
                                                                <Layers className="w-3 h-3" />
                                                                {variants.length}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{typeLabels[parent.type]}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                                        {parent.sku && <div className="font-mono">{parent.sku}</div>}
                                                        {parent.barcode && (
                                                            <div className="flex items-center gap-1">
                                                                <Barcode className="w-3 h-3" />
                                                                {parent.barcode}
                                                            </div>
                                                        )}
                                                        {!parent.sku && !parent.barcode && <span>-</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className={`font-mono text-sm font-medium ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                                        {Number(parent.stockQuantity).toFixed(parent.unit === ConsumableUnit.COUNT ? 0 : 2)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                        {unitLabels[parent.unit]}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="font-mono text-sm">
                                                        {Number(parent.averageCost).toFixed(2)} ₺
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleCreate(parent.id)}
                                                            title="Varyant Ekle"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(parent)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => handleDelete(parent.id)}
                                                            disabled={hasVariants}
                                                            title={hasVariants ? 'Önce varyantları silin' : 'Sil'}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {hasVariants && isExpanded && variants.map((variant) => {
                                                const isVariantLowStock = Number(variant.stockQuantity) <= Number(variant.minStockLevel);
                                                return (
                                                    <TableRow key={variant.id} className="bg-muted/30">
                                                        <TableCell></TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2 pl-4">
                                                                <span className="text-muted-foreground">└</span>
                                                                <span>{variant.name}</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {variant.conversionQuantity} {unitLabels[parent.unit]}/adet
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="text-xs text-muted-foreground">
                                                                {typeLabels[variant.type]}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-xs text-muted-foreground space-y-0.5">
                                                                {variant.sku && <div className="font-mono">{variant.sku}</div>}
                                                                {variant.barcode && (
                                                                    <div className="flex items-center gap-1">
                                                                        <Barcode className="w-3 h-3" />
                                                                        {variant.barcode}
                                                                    </div>
                                                                )}
                                                                {!variant.sku && !variant.barcode && <span>-</span>}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className={`font-mono text-sm font-medium ${isVariantLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                                                {Number(variant.stockQuantity).toFixed(variant.unit === ConsumableUnit.COUNT ? 0 : 2)}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground ml-1">
                                                                {unitLabels[variant.unit]}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="font-mono text-sm">
                                                                {Number(variant.averageCost).toFixed(2)} ₺
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleEdit(variant)}
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => handleDelete(variant.id)}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingConsumable
                                ? (editingConsumable.parentId ? 'Varyantı Düzenle' : 'Ana Malzemeyi Düzenle')
                                : isVariant
                                    ? 'Yeni Varyant Ekle'
                                    : 'Yeni Ana Malzeme Ekle'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {isVariant && (
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-1">
                                    <Layers className="w-4 h-4 text-blue-600" />
                                    <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Ana Malzeme</p>
                                </div>
                                <p className="font-semibold text-lg">
                                    {parentConsumables.find(p => p.id === formData.parentId)?.name || '-'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Bu varyant, ana malzemenin tipini ({typeLabels[formData.type]}) ve birimini ({unitLabels[formData.unit]}) devralır.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>{isVariant ? 'Varyant Adı' : 'Malzeme Adı'} *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={isVariant ? 'Örn: Küçük Poşet (10m)' : 'Örn: Poşet Rulosu'}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>SKU (Stok Kodu)</Label>
                                <Input
                                    value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                    placeholder={isVariant ? 'Opsiyonel' : 'Örn: POSET-500M'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Barkod</Label>
                                <Input
                                    value={formData.barcode}
                                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                    placeholder="Barkod numarası"
                                />
                            </div>
                        </div>

                        {!isVariant && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        )}

                        {isVariant && (
                            <div className="space-y-2">
                                <Label>Dönüşüm Miktarı</Label>
                                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm">1 adet varyant =</span>
                                        <Input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={formData.conversionQuantity}
                                            onChange={(e) => setFormData({ ...formData, conversionQuantity: parseFloat(e.target.value) || 1 })}
                                            className="w-20"
                                        />
                                        <span className="text-sm">
                                            <span className="font-medium">
                                                {unitLabels[parentConsumables.find(p => p.id === formData.parentId)?.unit || ConsumableUnit.COUNT]}
                                            </span>
                                            {' '}ana malzemeden
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Örnek: 500 metrelik poşet rulosundan 10 metrelik küçük poşetler üretiyorsanız, 
                                        dönüşüm miktarı <strong>10</strong> olmalı.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Kritik Stok Sınırı</Label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.minStockLevel}
                                onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Stok bu sınırın altına düştüğünde uyarı gösterilir.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
                            İptal
                        </Button>
                        <Button onClick={handleSubmit} className="w-full sm:w-auto">
                            {editingConsumable ? 'Güncelle' : 'Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Malzemeyi silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz. Varyantları olan bir ana malzeme silinemez.
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
