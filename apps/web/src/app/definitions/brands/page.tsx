'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBrands, createBrand, updateBrand, deleteBrand, Brand } from '@/lib/api';
import { Button } from '@/components/ui';
import { DataTable, DataTableColumn } from '@/components/ui';
import { Modal } from '@/components/ui';
import { Input } from '@/components/ui';
import { Badge } from '@/components/common/Badge';

export default function BrandsPage() {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [formData, setFormData] = useState({ name: '', isActive: true });
    const [processing, setProcessing] = useState(false);

    const fetchBrands = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getBrands();
            setBrands(res.data || []);
        } catch (err) {
            console.error('Failed to fetch brands:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBrands(); }, [fetchBrands]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            if (editingBrand) {
                await updateBrand(editingBrand.id, formData);
            } else {
                await createBrand(formData);
            }
            setIsModalOpen(false);
            setEditingBrand(null);
            setFormData({ name: '', isActive: true });
            fetchBrands();
        } catch (err) {
            console.error('Failed to save brand:', err);
            alert('Kaydetme hatası oluştu');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu markayı silmek istediğinize emin misiniz?')) return;
        try {
            await deleteBrand(id);
            fetchBrands();
        } catch (err) {
            console.error('Failed to delete brand:', err);
            alert('Silme hatası oluştu');
        }
    };

    const openEdit = (brand: Brand) => {
        setEditingBrand(brand);
        setFormData({ name: brand.name, isActive: brand.isActive });
        setIsModalOpen(true);
    };

    const openCreate = () => {
        setEditingBrand(null);
        setFormData({ name: '', isActive: true });
        setIsModalOpen(true);
    };

    const columns: DataTableColumn<Brand>[] = [
        { key: 'name', header: 'Marka Adı', sortable: true },
        {
            key: 'isActive',
            header: 'Durum',
            render: (brand) => (
                <Badge variant={brand.isActive ? 'success' : 'secondary'}>
                    {brand.isActive ? 'Aktif' : 'Pasif'}
                </Badge>
            )
        },
        {
            key: 'actions',
            header: 'İşlemler',
            align: 'right',
            render: (brand) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(brand)}>Düzenle</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(brand.id)}>Sil</Button>
                </div>
            )
        }
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-foreground">Markalar</h2>
                <Button onClick={openCreate}>
                    + Yeni Marka
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={brands}
                isLoading={loading}
                keyExtractor={(item) => item.id}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingBrand ? 'Markayı Düzenle' : 'Yeni Marka'}
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
                <form id="brand-form" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <Input
                            label="Marka Adı"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                            />
                            <label htmlFor="isActive" className="ml-2 text-sm text-foreground">Aktif</label>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
