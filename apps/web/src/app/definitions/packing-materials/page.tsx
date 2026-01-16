'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPackingMaterials, createPackingMaterial, updatePackingMaterial, deletePackingMaterial, PackingMaterial, PackingMaterialType } from '@/lib/api';
import { Button } from '@/components/common/Button';
import { Table, Column } from '@/components/common/Table';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Badge } from '@/components/common/Badge';

export default function PackingMaterialsPage() {
    const [materials, setMaterials] = useState<PackingMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<PackingMaterial | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        type: PackingMaterialType.BOX,
        stockQuantity: 0,
        lowStockThreshold: 10,
        isActive: true
    });
    const [processing, setProcessing] = useState(false);

    const fetchMaterials = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPackingMaterials();
            setMaterials(res.data || []);
        } catch (err) {
            console.error('Failed to fetch materials:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            if (editingMaterial) {
                await updatePackingMaterial(editingMaterial.id, formData);
            } else {
                await createPackingMaterial(formData);
            }
            setIsModalOpen(false);
            setEditingMaterial(null);
            setFormData({
                name: '',
                type: PackingMaterialType.BOX,
                stockQuantity: 0,
                lowStockThreshold: 10,
                isActive: true
            });
            fetchMaterials();
        } catch (err) {
            console.error('Failed to save material:', err);
            alert('Kaydetme hatası oluştu');
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu malzemeyi silmek istediğinize emin misiniz?')) return;
        try {
            await deletePackingMaterial(id);
            fetchMaterials();
        } catch (err) {
            console.error('Failed to delete material:', err);
            alert('Silme hatası oluştu');
        }
    };

    const openEdit = (material: PackingMaterial) => {
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

    const openCreate = () => {
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

    const columns: Column<PackingMaterial>[] = [
        { key: 'name', header: 'Malzeme Adı', sortable: true },
        {
            key: 'type',
            header: 'Tip',
            render: (item) => <Badge variant="outline">{typeLabels[item.type] || item.type}</Badge>
        },
        {
            key: 'stockQuantity',
            header: 'Stok',
            render: (item) => (
                <span className={`font-mono font-bold ${item.stockQuantity <= item.lowStockThreshold ? 'text-red-500' : 'text-foreground'}`}>
                    {item.stockQuantity}
                </span>
            )
        },
        { key: 'lowStockThreshold', header: 'Kritik Sınır' },
        {
            key: 'isActive',
            header: 'Durum',
            render: (item) => (
                <Badge variant={item.isActive ? 'success' : 'secondary'}>
                    {item.isActive ? 'Aktif' : 'Pasif'}
                </Badge>
            )
        },
        {
            key: 'actions',
            header: 'İşlemler',
            align: 'right',
            render: (item) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>Düzenle</Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(item.id)}>Sil</Button>
                </div>
            )
        }
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-foreground">Sarf Malzemeler</h2>
                <Button onClick={openCreate}>
                    + Malzeme Ekle
                </Button>
            </div>

            <Table
                columns={columns}
                data={materials}
                isLoading={loading}
                keyExtractor={(item) => item.id}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingMaterial ? 'Malzemeyi Düzenle' : 'Yeni Malzeme'}
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
                <form id="packing-material-form" onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Malzeme Adı"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Select
                        label="Tip"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as PackingMaterialType })}
                        options={typeOptions}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Stok Miktarı"
                            type="number"
                            min="0"
                            value={formData.stockQuantity}
                            onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                            required
                        />
                        <Input
                            label="Kritik Stok Sınırı"
                            type="number"
                            min="0"
                            value={formData.lowStockThreshold}
                            onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                            required
                        />
                    </div>
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
