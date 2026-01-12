'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/components/common/ToastContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Shelf {
    id: string;
    name: string;
    barcode: string;
    type: string;
    warehouseId: string;
    parentId: string | null;
    path: string;
    globalSlot: number;
    isSellable: boolean;
    isReservable: boolean;
    children?: Shelf[];
    warehouse?: { name: string };
}

interface Warehouse {
    id: string;
    name: string;
}

const SHELF_TYPES = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'DAMAGED', label: 'Hasarlı' },
    { value: 'PACKING', label: 'Paketleme' },
    { value: 'PICKING', label: 'Toplama' },
    { value: 'RECEIVING', label: 'Mal Kabul' },
];

export default function ShelvesPage() {
    const [shelves, setShelves] = useState<Shelf[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const { success, error } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        barcode: '',
        type: 'NORMAL',
        parentId: '',
        globalSlot: 0,
    });

    const fetchWarehouses = async () => {
        const res = await fetch(`${API_URL}/warehouses?page=1&limit=100`, { credentials: 'include' });
        const data = await res.json();
        setWarehouses(data.data || []);
        if (data.data?.[0]) setSelectedWarehouse(data.data[0].id);
    };

    const fetchShelves = useCallback(async () => {
        if (!selectedWarehouse) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/shelves/tree/${selectedWarehouse}`, { credentials: 'include' });
            const data = await res.json();
            setShelves(Array.isArray(data) ? data : []);
        } catch (err) {
            error('Raflar yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [selectedWarehouse]);

    useEffect(() => { fetchWarehouses(); }, []);
    useEffect(() => { if (selectedWarehouse) fetchShelves(); }, [selectedWarehouse, fetchShelves]);

    const handleCreate = () => {
        setEditingShelf(null);
        setFormData({ name: '', barcode: '', type: 'NORMAL', parentId: '', globalSlot: 0 });
        setIsModalOpen(true);
    };

    const handleEdit = (shelf: Shelf) => {
        setEditingShelf(shelf);
        setFormData({
            name: shelf.name,
            barcode: shelf.barcode,
            type: shelf.type,
            parentId: shelf.parentId || '',
            globalSlot: shelf.globalSlot,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...formData, warehouseId: selectedWarehouse, parentId: formData.parentId || null };
            const url = editingShelf ? `${API_URL}/shelves/${editingShelf.id}` : `${API_URL}/shelves`;
            const method = editingShelf ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed');
            success(editingShelf ? 'Raf güncellendi' : 'Raf oluşturuldu');
            setIsModalOpen(false);
            fetchShelves();
        } catch (err) {
            error('İşlem başarısız');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu rafı silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_URL}/shelves/${id}`, { method: 'DELETE', credentials: 'include' });
            success('Raf silindi');
            fetchShelves();
        } catch (err) {
            error('Silme başarısız');
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const renderShelfTree = (items: Shelf[], level = 0) => (
        <div className="space-y-1">
            {items.map(shelf => (
                <div key={shelf.id}>
                    <div
                        className={`flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer ${level > 0 ? 'ml-' + (level * 4) : ''}`}
                        style={{ marginLeft: level * 16 }}
                    >
                        {shelf.children?.length ? (
                            <button onClick={() => toggleExpand(shelf.id)} className="text-muted-foreground">
                                {expandedIds.has(shelf.id) ? '▼' : '▶'}
                            </button>
                        ) : <span className="w-4" />}
                        <span className={`px-2 py-0.5 text-xs rounded ${shelf.type === 'RECEIVING' ? 'bg-blue-100 text-blue-800' :
                                shelf.type === 'DAMAGED' ? 'bg-red-100 text-red-800' :
                                    shelf.type === 'PICKING' ? 'bg-green-100 text-green-800' :
                                        shelf.type === 'PACKING' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                            }`}>
                            {shelf.type}
                        </span>
                        <span className="font-medium">{shelf.name}</span>
                        <span className="text-muted-foreground text-sm">[{shelf.barcode}]</span>
                        <div className="ml-auto flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(shelf)}>Düzenle</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(shelf.id)}>Sil</Button>
                        </div>
                    </div>
                    {shelf.children?.length && expandedIds.has(shelf.id) ? renderShelfTree(shelf.children, level + 1) : null}
                </div>
            ))}
        </div>
    );

    const flatShelves: { id: string; name: string }[] = [];
    const flattenShelves = (items: Shelf[], prefix = '') => {
        items.forEach(s => {
            flatShelves.push({ id: s.id, name: prefix + s.name });
            if (s.children) flattenShelves(s.children, prefix + s.name + ' > ');
        });
    };
    flattenShelves(shelves);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">Raf Yönetimi</h2>
                    <p className="text-sm text-muted-foreground">Depo raflarını hiyerarşik olarak yönetin</p>
                </div>
                <div className="flex gap-3">
                    <Select
                        value={selectedWarehouse}
                        onChange={(e) => setSelectedWarehouse(e.target.value)}
                        options={warehouses.map(w => ({ value: w.id, label: w.name }))}
                    />
                    <Button onClick={handleCreate}>+ Yeni Raf</Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Yükleniyor...</div>
            ) : shelves.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">Bu depoda henüz raf yok</div>
            ) : (
                <div className="bg-card rounded-lg p-4 border border-border">
                    {renderShelfTree(shelves)}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingShelf ? 'Raf Düzenle' : 'Yeni Raf'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input label="Raf Adı" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                    <Input label="Barkod" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} required />
                    <Select label="Raf Tipi" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} options={SHELF_TYPES} />
                    <Select
                        label="Üst Raf (opsiyonel)"
                        value={formData.parentId}
                        onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                        options={[{ value: '', label: 'Kök Raf' }, ...flatShelves.filter(s => s.id !== editingShelf?.id).map(s => ({ value: s.id, label: s.name }))]}
                    />
                    <Input label="Global Slot" type="number" value={formData.globalSlot} onChange={(e) => setFormData({ ...formData, globalSlot: parseInt(e.target.value) || 0 })} />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>İptal</Button>
                        <Button type="submit">{editingShelf ? 'Güncelle' : 'Oluştur'}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
