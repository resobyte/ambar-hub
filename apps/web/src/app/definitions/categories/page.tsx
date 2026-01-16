'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, Category } from '@/lib/api';
import { Button } from '@/components/common/Button';
import { Table, Column } from '@/components/common/Table';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Badge } from '@/components/common/Badge';

// Helper type for flattened category with depth
interface FlattenedCategory extends Category {
    depth: number;
    hasChildren: boolean;
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [allFlattenedCategories, setAllFlattenedCategories] = useState<FlattenedCategory[]>([]);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState<{ name: string; parentId: string; isActive: boolean }>({ name: '', parentId: '', isActive: true });
    const [processing, setProcessing] = useState(false);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getCategories();
            setCategories(res.data || []);
        } catch (err) {
            console.error('Failed to fetch categories:', err);
        } finally {
            setLoading(false);
        }
    }, []);

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
        // Helper to check if a category should be visible
        // A category is visible if its parent is expanded (or if it has no parent/is root)

        // We can just iterate through the flat list.
        // But since the flat list is depth-first ordered, we can track "current allowed depth" or simply check parent visibility.
        // simpler approach: iterate and verify if all ancestors are expanded. 
        // OR: since it is flattened depth-first:
        // root1 -> visible
        //   child1 -> visible only if root1 expanded
        //     grandchild1 -> visible only if root1 AND child1 expanded

        // Let's use a set of "visible parent IDs"
        // Actually since we have a flat list in order:
        // We can just iterate. If we encounter a node, we check if its parent is in the "expanded" set?
        // No, we need to check if its parent is currently visible AND expanded.

        // Let's re-traverse or filter.
        // Filter approach: A node is visible if all its ancestors are expanded.
        // This might be slow if we walk up the tree every time.

        // Faster approach: recursive walk like 'flatten' but with visibility check.
        const traverse = (cats: Category[], isParentExpanded: boolean) => {
            for (const cat of cats) {
                if (isParentExpanded) {
                    const flattened = allFlattenedCategories.find(c => c.id === cat.id);
                    if (flattened) {
                        visible.push(flattened);
                        // Its children are visible only if THIS category is expanded
                        const isExpanded = expandedIds.has(cat.id);
                        if (cat.children && cat.children.length > 0) {
                            traverse(cat.children, isExpanded);
                        }
                    }
                }
            }
        };

        // Roots are always "parent expanded" effectively
        traverse(categories, true);
        return visible;
    }, [categories, allFlattenedCategories, expandedIds]);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const data = {
                name: formData.name,
                parentId: formData.parentId || undefined,
                isActive: formData.isActive
            };

            if (editingCategory) {
                await updateCategory(editingCategory.id, data);
            } else {
                await createCategory(data);
            }
            setIsModalOpen(false);
            setEditingCategory(null);
            setFormData({ name: '', parentId: '', isActive: true });
            fetchCategories();
        } catch (err) {
            console.error('Failed to save category:', err);
            alert('Kaydetme hatası oluştu');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz? Alt kategorileri varsa onlar da etkilenebilir.')) return;
        try {
            await deleteCategory(id);
            fetchCategories();
        } catch (err) {
            console.error('Failed to delete category:', err);
            alert('Silme hatası oluştu');
        }
    };

    const openEdit = (category: Category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            parentId: category.parent?.id || '',
            isActive: category.isActive
        });
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingCategory(null);
        setFormData({ name: '', parentId: '', isActive: true });
        setIsModalOpen(true);
    };

    const columns: Column<FlattenedCategory>[] = [
        {
            key: 'name',
            header: 'Kategori Adı',
            sortable: false,
            render: (cat) => (
                <div
                    className="flex items-center"
                    style={{ paddingLeft: `${cat.depth * 24}px` }}
                >
                    <div className="w-6 h-6 flex items-center justify-center mr-1">
                        {cat.hasChildren ? (
                            <button
                                onClick={() => toggleExpand(cat.id)}
                                className="p-0.5 hover:bg-gray-100 rounded text-gray-500"
                            >
                                {expandedIds.has(cat.id) ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                )}
                            </button>
                        ) : (
                            <div className="w-4" />
                        )}
                    </div>
                    {cat.depth > 0 && (
                        <div className="mr-2 text-gray-300">
                            └
                        </div>
                    )}
                    <span className={cat.depth === 0 ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                        {cat.name}
                    </span>
                </div>
            )
        },
        {
            key: 'isActive',
            header: 'Durum',
            width: '120px',
            align: 'center',
            render: (category) => (
                <Badge variant={category.isActive ? 'success' : 'secondary'}>
                    {category.isActive ? 'Aktif' : 'Pasif'}
                </Badge>
            )
        },
        {
            key: 'actions',
            header: 'İşlemler',
            align: 'right',
            width: '200px',
            render: (category) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(category)}>Düzenle</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(category.id)}>Sil</Button>
                </div>
            )
        }
    ];

    // Create options for parent selection (flattened nicely)
    const categoryOptions = useMemo(() => {
        return allFlattenedCategories
            .filter(c => c.id !== editingCategory?.id) // Prevent selecting self as parent (circular)
            .map(c => ({
                value: c.id,
                label: '\u00A0\u00A0'.repeat(c.depth) + (c.depth > 0 ? '└ ' : '') + c.name
            }));
    }, [allFlattenedCategories, editingCategory]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-foreground">Kategoriler</h2>
                <Button onClick={openCreate}>
                    + Yeni Kategori
                </Button>
            </div>

            <Table
                columns={columns}
                data={visibleCategories}
                isLoading={loading}
                keyExtractor={(item) => item.id}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}
                footer={
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                        >
                            İptal
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            isLoading={processing}
                        >
                            Kaydet
                        </Button>
                    </div>
                }
            >
                <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Kategori Adı"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Select
                        label="Üst Kategori"
                        value={formData.parentId}
                        onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                        options={categoryOptions}
                    />
                    <div className="flex items-center pt-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <label htmlFor="isActive" className="ml-2 text-sm text-foreground">Aktif</label>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
