'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, Category } from '@/lib/api';
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
import { Loader2, Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

// Helper type for flattened category with depth
interface FlattenedCategory extends Category {
    depth: number;
    hasChildren: boolean;
}

export default function CategoriesPage() {
    const { toast } = useToast();
    const [categories, setCategories] = useState<Category[]>([]);
    const [allFlattenedCategories, setAllFlattenedCategories] = useState<FlattenedCategory[]>([]);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    // Pagination
    const { page, pageSize, setPage, setPageSize } = useTableQuery({
        defaultPage: 1,
        defaultPageSize: 20, // Larger default for tree view
    });

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

    const [formData, setFormData] = useState<{ name: string; parentId: string; isActive: boolean }>({ name: '', parentId: '', isActive: true });

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getCategories();
            setCategories(res.data || []);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Kategoriler yüklenemedi' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    // Flatten tree for display with depth calculation
    const flatten = useCallback((cats: Category[], depth = 0): FlattenedCategory[] => {
        let result: FlattenedCategory[] = [];
        for (const cat of cats) {
            result.push({
                ...cat,
                depth,
                isActive: cat.isActive ?? true,
                hasChildren: (cat.children?.length ?? 0) > 0
            });
            if (cat.children && cat.children.length > 0) {
                result = result.concat(flatten(cat.children, depth + 1));
            }
        }
        return result;
    }, []);

    useEffect(() => {
        setAllFlattenedCategories(flatten(categories));
    }, [categories, flatten]);

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedIds(newExpanded);
    };

    // Calculate visible categories based on expanded state
    const visibleCategories = useMemo(() => {
        const visible: FlattenedCategory[] = [];
        const traverse = (cats: Category[], isParentExpanded: boolean) => {
            for (const cat of cats) {
                if (isParentExpanded) {
                    const flattened = allFlattenedCategories.find(c => c.id === cat.id);
                    if (flattened) {
                        visible.push(flattened);
                        const isExpanded = expandedIds.has(cat.id);
                        if (cat.children && cat.children.length > 0) {
                            traverse(cat.children, isExpanded);
                        }
                    }
                }
            }
        };
        traverse(categories, true);
        return visible;
    }, [categories, allFlattenedCategories, expandedIds]);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const handleCreate = () => {
        setEditingCategory(null);
        setFormData({ name: '', parentId: '', isActive: true });
        setIsModalOpen(true);
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            parentId: category.parent?.id || '',
            isActive: category.isActive ?? true
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeletingCategoryId(id);
        setIsDeleteOpen(true);
    };

    const handleSubmit = async () => {
        try {
            const data = {
                name: formData.name,
                parentId: formData.parentId || undefined,
                isActive: formData.isActive
            };

            if (editingCategory) {
                await updateCategory(editingCategory.id, data);
                toast({ title: 'Başarılı', description: 'Kategori güncellendi', variant: 'success' });
            } else {
                await createCategory(data);
                toast({ title: 'Başarılı', description: 'Kategori oluşturuldu', variant: 'success' });
            }
            setIsModalOpen(false);
            fetchCategories();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: err.message || 'İşlem başarısız'
            });
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingCategoryId) return;
        try {
            await deleteCategory(deletingCategoryId);
            toast({ title: 'Başarılı', description: 'Kategori silindi', variant: 'success' });
            setIsDeleteOpen(false);
            fetchCategories();
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: err.message || 'Silme işlemi başarısız'
            });
        }
    };

    const categoryOptions = useMemo(() => {
        return allFlattenedCategories
            .filter(c => c.id !== editingCategory?.id)
            .map(c => ({
                value: c.id,
                label: '\u00A0\u00A0'.repeat(c.depth) + (c.depth > 0 ? '└ ' : '') + c.name
            }));
    }, [allFlattenedCategories, editingCategory]);

    // Pagination logic applied to visible tree nodes
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCategories = visibleCategories.slice(startIndex, endIndex);
    const totalPages = Math.ceil(visibleCategories.length / pageSize);

    return (
        <div className="space-y-4">
            <div className="flex justify-end items-center">
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" /> Yeni Kategori
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kategori Adı</TableHead>
                                <TableHead className="text-center w-[120px]">Durum</TableHead>
                                <TableHead className="text-right w-[200px]">İşlemler</TableHead>
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
                            ) : paginatedCategories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        Kategori bulunamadı.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedCategories.map((cat) => (
                                    <TableRow key={cat.id}>
                                        <TableCell>
                                            <div
                                                className="flex items-center"
                                                style={{ paddingLeft: `${cat.depth * 24}px` }}
                                            >
                                                <div className="w-6 h-6 flex items-center justify-center mr-1">
                                                    {cat.hasChildren ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 p-0 hover:bg-muted"
                                                            onClick={() => toggleExpand(cat.id)}
                                                        >
                                                            {expandedIds.has(cat.id) ? (
                                                                <ChevronDown className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    ) : (
                                                        <div className="w-6" />
                                                    )}
                                                </div>
                                                {cat.depth > 0 && (
                                                    <span className="mr-2 text-muted-foreground/50">
                                                        └
                                                    </span>
                                                )}
                                                <span className={cat.depth === 0 ? 'font-medium' : ''}>
                                                    {cat.name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                variant="outline"
                                                className={cat.isActive
                                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                                    : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                                }
                                            >
                                                {cat.isActive ? 'Aktif' : 'Pasif'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(cat)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDelete(cat.id)}
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
                totalItems={visibleCategories.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
            />

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Kategori Adı</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Kategori adı girin"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Üst Kategori</Label>
                            <Select
                                value={formData.parentId}
                                onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seçiniz (Opsiyonel)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryOptions.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
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
                            {editingCategory ? 'Güncelle' : 'Oluştur'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kategoriyi silmek istediğinize emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem geri alınamaz. Alt kategorileri varsa onlar da etkilenebilir.
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
