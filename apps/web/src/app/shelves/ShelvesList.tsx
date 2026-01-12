'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
    stocks?: { quantity: number }[];
}

interface Warehouse {
    id: string;
    name: string;
    address?: string;
}

// Selected item can be either a warehouse or a shelf
type SelectedItem =
    | { type: 'warehouse'; data: Warehouse }
    | { type: 'shelf'; data: Shelf; warehouseId: string };

const SHELF_TYPES = [
    { value: 'NORMAL', label: 'Normal' },
    { value: 'DAMAGED', label: 'Hasarlı' },
    { value: 'PACKING', label: 'Paketleme' },
    { value: 'PICKING', label: 'Toplama' },
    { value: 'RECEIVING', label: 'Mal Kabul' },
];

// Warehouse/Building icon
const WarehouseIcon = () => (
    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 8.5L12 3 2 8.5 12 14l10-5.5v8.5h2V8.5zM6 18v-4.93l6 3.31 6-3.31V18c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2z" />
    </svg>
);

// Folder icon component
const FolderIcon = ({ isExpanded, hasChildren }: { isExpanded: boolean; hasChildren: boolean }) => {
    if (!hasChildren) {
        return (
            <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
        );
    }

    if (isExpanded) {
        return (
            <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V6h5.17l2 2H20v10z" />
            </svg>
        );
    }

    return (
        <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
    );
};

// Chevron icons
const ChevronRight = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
);

const ChevronDown = () => (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

export function ShelvesList() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [shelvesMap, setShelvesMap] = useState<Record<string, Shelf[]>>({});
    const [loading, setLoading] = useState(true);
    const [loadingWarehouse, setLoadingWarehouse] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [detailsShelf, setDetailsShelf] = useState<Shelf | null>(null);
    const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
    const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(new Set());
    const [expandedShelves, setExpandedShelves] = useState<Set<string>>(new Set());
    const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
    const { success, error } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        type: 'NORMAL',
        parentId: '',
        globalSlot: 0,
        warehouseId: '',
    });

    // Transfer state
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [sourceStocks, setSourceStocks] = useState<any[]>([]);
    const [transferFormData, setTransferFormData] = useState({
        fromShelfId: '',
        toShelfId: '',
        productId: '',
        quantity: 0
    });
    const [globalShelves, setGlobalShelves] = useState<Shelf[]>([]);

    const fetchWarehouses = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/warehouses?page=1&limit=100`, { credentials: 'include' });
            const data = await res.json();
            setWarehouses(data.data || []);
        } catch (err) {
            error('Depolar yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    // Track which warehouses are being fetched to prevent duplicate requests
    const fetchingRef = useRef<Set<string>>(new Set());
    // Keep a ref to current shelvesMap to avoid stale closure issues
    const shelvesMapRef = useRef(shelvesMap);
    shelvesMapRef.current = shelvesMap;

    const fetchWarehouseShelves = async (warehouseId: string, forceRefresh = false) => {
        // Prevent duplicate requests
        if (fetchingRef.current.has(warehouseId)) return;

        // Don't fetch if already loaded and not forcing refresh (use ref for current value)
        if (!forceRefresh && shelvesMapRef.current[warehouseId] !== undefined) return;

        fetchingRef.current.add(warehouseId);
        setLoadingWarehouse(warehouseId);

        try {
            const res = await fetch(`${API_URL}/shelves/tree/${warehouseId}`, { credentials: 'include' });
            const json = await res.json();
            // API returns { success: true, data: [...] } or just [...] for tree endpoint
            const shelves = Array.isArray(json) ? json : (json.data || []);
            setShelvesMap(prev => ({
                ...prev,
                [warehouseId]: shelves,
            }));
        } catch (err) {
            error('Raflar yüklenemedi');
        } finally {
            fetchingRef.current.delete(warehouseId);
            setLoadingWarehouse(null);
        }
    };

    const refreshWarehouseShelves = (warehouseId: string) => {
        return fetchWarehouseShelves(warehouseId, true);
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const toggleWarehouse = async (warehouseId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newExpanded = new Set(expandedWarehouses);

        if (newExpanded.has(warehouseId)) {
            newExpanded.delete(warehouseId);
        } else {
            newExpanded.add(warehouseId);
            // Fetch shelves when expanding
            await fetchWarehouseShelves(warehouseId);
        }

        setExpandedWarehouses(newExpanded);
    };

    const toggleShelf = (shelfId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedShelves(prev => {
            const next = new Set(prev);
            if (next.has(shelfId)) next.delete(shelfId);
            else next.add(shelfId);
            return next;
        });
    };

    const selectWarehouse = (warehouse: Warehouse) => {
        setSelectedItem({ type: 'warehouse', data: warehouse });
    };

    const selectShelf = (shelf: Shelf, warehouseId: string) => {
        setSelectedItem({ type: 'shelf', data: shelf, warehouseId });
    };

    const showShelfDetails = (shelf: Shelf) => {
        setDetailsShelf(shelf);
        setIsDetailsOpen(true);
    };

    const handleCreate = (warehouseId?: string, parentId?: string) => {
        setEditingShelf(null);
        setFormData({
            name: '',
            type: 'NORMAL',
            parentId: parentId || '',
            globalSlot: 0,
            warehouseId: warehouseId || '',
        });
        setIsModalOpen(true);
    };

    const handleEdit = (shelf: Shelf) => {
        setEditingShelf(shelf);
        setFormData({
            name: shelf.name,
            type: shelf.type,
            parentId: shelf.parentId || '',
            globalSlot: shelf.globalSlot ?? 0,
            warehouseId: shelf.warehouseId,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                parentId: formData.parentId || null,
            };
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

            // Refresh the warehouse's shelves and ensure it's expanded
            if (formData.warehouseId) {
                // Ensure warehouse is expanded
                setExpandedWarehouses(prev => {
                    const next = new Set(prev);
                    next.add(formData.warehouseId);
                    return next;
                });
                // Force refresh by clearing cache first (both state and ref)
                const clearedMap = { ...shelvesMapRef.current };
                delete clearedMap[formData.warehouseId];
                shelvesMapRef.current = clearedMap;
                setShelvesMap(clearedMap);
                await refreshWarehouseShelves(formData.warehouseId);
            }
        } catch (err) {
            error('İşlem başarısız');
        }
    };

    const handleDelete = async (id: string, warehouseId: string) => {
        if (!confirm('Bu rafı silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_URL}/shelves/${id}`, { method: 'DELETE', credentials: 'include' });
            success('Raf silindi');
            setSelectedItem(null);
            await refreshWarehouseShelves(warehouseId);
        } catch (err) {
            error('Silme başarısız');
        }
    };

    // Flatten all loaded shelves for dropdown
    const getAllShelves = useCallback(() => {
        const flat: Shelf[] = [];
        const process = (list: Shelf[]) => {
            list.forEach(s => {
                flat.push(s);
                if (s.children) process(s.children);
            });
        };
        Object.values(shelvesMap).forEach(list => {
            if (list) process(list);
        });
        return flat;
    }, [shelvesMap]);

    const fetchGlobalShelves = async () => {
        try {
            const res = await fetch(`${API_URL}/shelves`, { credentials: 'include' });
            const json = await res.json();
            const data = json.data || json;
            setGlobalShelves(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Raf listesi alınamadı');
        }
    };

    const fetchSourceStocks = async (shelfId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/shelves/${shelfId}/stock`, { credentials: 'include' });
            const json = await res.json();
            const data = json.data || json;
            setSourceStocks(Array.isArray(data) ? data : []);
        } catch (err) {
            error('Raf stok bilgisi alınamadı');
            setSourceStocks([]);
        } finally {
            setLoading(false);
        }
    };

    const openTransferModal = async () => {
        const shelf = getSelectedShelf();

        setIsTransferModalOpen(true);
        fetchGlobalShelves(); // Fetch all shelves for the dropdowns

        if (shelf) {
            setTransferFormData({ fromShelfId: shelf.id, toShelfId: '', productId: '', quantity: 0 });
            await fetchSourceStocks(shelf.id);
        } else {
            setTransferFormData({ fromShelfId: '', toShelfId: '', productId: '', quantity: 0 });
            setSourceStocks([]);
        }
    };

    const handleTransfer = async () => {
        if (!transferFormData.fromShelfId || !transferFormData.toShelfId || !transferFormData.productId || transferFormData.quantity <= 0) {
            error('Lütfen tüm alanları doldurun');
            return;
        }

        if (transferFormData.fromShelfId === transferFormData.toShelfId) {
            error('Kaynak ve hedef raf aynı olamaz');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/shelves/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(transferFormData),
            });

            if (!res.ok) throw new Error('Transfer failed');

            success('Transfer başarılı');
            setIsTransferModalOpen(false);

            // Refresh logic
            const allShelves = getAllShelves();
            const sourceShelf = allShelves.find(s => s.id === transferFormData.fromShelfId);
            if (sourceShelf?.warehouseId) {
                await fetchWarehouseShelves(sourceShelf.warehouseId, true);
            }
            const targetShelf = allShelves.find(s => s.id === transferFormData.toShelfId);
            if (targetShelf?.warehouseId && targetShelf.warehouseId !== sourceShelf?.warehouseId) {
                await fetchWarehouseShelves(targetShelf.warehouseId, true);
            }
        } catch (err) {
            error('Transfer başarısız');
        }
    };

    // Calculate total stock for a shelf
    const getTotalStock = (shelf: Shelf): number => {
        let total = shelf.stocks?.reduce((sum, s) => sum + s.quantity, 0) || 0;
        if (shelf.children) {
            shelf.children.forEach(child => {
                total += getTotalStock(child);
            });
        }
        return total;
    };

    // Get flat list of shelves for parent selection
    const getFlatShelves = (warehouseId: string): { id: string; name: string }[] => {
        const result: { id: string; name: string }[] = [];
        const flattenShelves = (items: Shelf[], prefix = '') => {
            items.forEach(s => {
                result.push({ id: s.id, name: prefix + s.name });
                if (s.children) flattenShelves(s.children, prefix + s.name + ' > ');
            });
        };
        flattenShelves(shelvesMap[warehouseId] || []);
        return result;
    };

    const renderShelfTree = (items: Shelf[], warehouseId: string, level = 0) => (
        <>
            {items.map((shelf) => {
                const hasChildren = shelf.children && shelf.children.length > 0;
                const isExpanded = expandedShelves.has(shelf.id);
                const isSelected = selectedItem?.type === 'shelf' && selectedItem.data.id === shelf.id;
                const totalStock = getTotalStock(shelf);

                return (
                    <div key={shelf.id}>
                        <div
                            className={`flex items-center py-1.5 cursor-pointer hover:bg-muted/50 rounded transition-colors ${isSelected ? 'bg-primary/20' : ''}`}
                            onClick={() => selectShelf(shelf, warehouseId)}
                            onDoubleClick={() => showShelfDetails(shelf)}
                            style={{ paddingLeft: 24 + level * 20 }}
                        >
                            {/* Expand/Collapse button */}
                            {hasChildren ? (
                                <button
                                    onClick={(e) => toggleShelf(shelf.id, e)}
                                    className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground mr-1"
                                >
                                    {isExpanded ? <ChevronDown /> : <ChevronRight />}
                                </button>
                            ) : (
                                <div className="w-4 mr-1" />
                            )}

                            {/* Folder Icon */}
                            <FolderIcon isExpanded={isExpanded} hasChildren={!!hasChildren} />

                            {/* Shelf name and stock count */}
                            <span className={`ml-2 text-sm ${isSelected ? 'font-semibold' : ''}`}>
                                {shelf.name}
                                <span className="text-muted-foreground ml-1">({totalStock.toLocaleString('tr-TR')})</span>
                            </span>
                        </div>

                        {/* Children */}
                        {hasChildren && isExpanded && (
                            <div className="relative">
                                {/* Vertical tree line */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 border-l border-gray-300 dark:border-gray-600"
                                    style={{ marginLeft: 24 + level * 20 + 7 }}
                                />
                                {renderShelfTree(shelf.children!, warehouseId, level + 1)}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );

    // Get action button state based on selected item
    const getSelectedWarehouseId = (): string | null => {
        if (!selectedItem) return null;
        if (selectedItem.type === 'warehouse') return selectedItem.data.id;
        return selectedItem.warehouseId;
    };

    const getSelectedShelf = (): Shelf | null => {
        if (selectedItem?.type === 'shelf') return selectedItem.data;
        return null;
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">Depo & Raf Ağacı</h2>
                    <p className="text-sm text-muted-foreground">Depo ve raflarınızı Windows Dosya Yöneticisi stilinde yönetin</p>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Button
                    variant="outline"
                    onClick={() => {
                        const warehouseId = getSelectedWarehouseId();
                        const parentId = getSelectedShelf()?.id;
                        if (warehouseId) {
                            handleCreate(warehouseId, parentId);
                        }
                    }}
                    disabled={!getSelectedWarehouseId()}
                >
                    + Yeni Raf
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        const shelf = getSelectedShelf();
                        if (shelf) handleEdit(shelf);
                    }}
                    disabled={!getSelectedShelf()}
                >
                    Düzenle
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        const shelf = getSelectedShelf();
                        if (shelf && selectedItem?.type === 'shelf') {
                            handleDelete(shelf.id, selectedItem.warehouseId);
                        }
                    }}
                    disabled={!getSelectedShelf()}
                >
                    Sil
                </Button>
                <Button
                    variant="outline"
                    onClick={() => {
                        // Collect all shelves from all expanded warehouses
                        const allShelves: Array<{ id: string; name: string; barcode: string; globalSlot: number | null }> = [];

                        const collectShelves = (items: Shelf[]) => {
                            items.forEach(shelf => {
                                allShelves.push({
                                    id: shelf.id,
                                    name: shelf.name,
                                    barcode: shelf.barcode,
                                    globalSlot: shelf.globalSlot,
                                });
                                if (shelf.children && shelf.children.length > 0) {
                                    collectShelves(shelf.children);
                                }
                            });
                        };

                        // Collect from all warehouses that have shelves loaded
                        Object.values(shelvesMap).forEach(shelves => {
                            if (shelves && shelves.length > 0) {
                                collectShelves(shelves);
                            }
                        });

                        if (allShelves.length === 0) {
                            error('Yazdırılacak raf bulunamadı. Önce bir depoyu genişletin.');
                            return;
                        }

                        // Open print page in new window
                        const data = encodeURIComponent(JSON.stringify(allShelves));
                        window.open(`/shelves/print?data=${data}`, '_blank');
                    }}
                >
                    Barkodları Yazdır
                </Button>
                <Button
                    variant="outline"
                    onClick={openTransferModal}
                >
                    Transfer Et
                </Button>


                {selectedItem && (
                    <span className="text-sm text-muted-foreground ml-4">
                        Seçili: {selectedItem.type === 'warehouse' ? selectedItem.data.name : selectedItem.data.name}
                    </span>
                )}
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Yükleniyor...</div>
            ) : warehouses.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">Henüz depo yok</div>
            ) : (
                <div className="bg-card rounded-lg border border-border overflow-auto max-h-[600px]">
                    {/* Tree view */}
                    <div className="p-2">
                        {warehouses.map((warehouse) => {
                            const isExpanded = expandedWarehouses.has(warehouse.id);
                            const isSelected = selectedItem?.type === 'warehouse' && selectedItem.data.id === warehouse.id;
                            const isLoading = loadingWarehouse === warehouse.id;
                            const shelves = shelvesMap[warehouse.id] || [];

                            return (
                                <div key={warehouse.id}>
                                    {/* Warehouse row */}
                                    <div
                                        className={`flex items-center py-2 px-2 cursor-pointer hover:bg-muted/50 rounded transition-colors ${isSelected ? 'bg-primary/20' : ''}`}
                                        onClick={() => selectWarehouse(warehouse)}
                                        onDoubleClick={() => toggleWarehouse(warehouse.id)}
                                    >
                                        {/* Expand/Collapse button */}
                                        <button
                                            onClick={(e) => toggleWarehouse(warehouse.id, e)}
                                            className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground mr-1"
                                        >
                                            {isLoading ? (
                                                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24">
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                        fill="none"
                                                    />
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    />
                                                </svg>
                                            ) : isExpanded ? (
                                                <ChevronDown />
                                            ) : (
                                                <ChevronRight />
                                            )}
                                        </button>

                                        {/* Warehouse Icon */}
                                        <WarehouseIcon />

                                        {/* Warehouse name */}
                                        <span className={`ml-2 text-sm font-medium ${isSelected ? 'font-semibold' : ''}`}>
                                            {warehouse.name}
                                        </span>
                                        {warehouse.address && (
                                            <span className="text-muted-foreground text-xs ml-2">
                                                ({warehouse.address})
                                            </span>
                                        )}
                                    </div>

                                    {/* Shelves tree */}
                                    {isExpanded && (
                                        <div className="relative">
                                            {/* Vertical tree line */}
                                            <div
                                                className="absolute left-0 top-0 bottom-0 border-l border-gray-300 dark:border-gray-600"
                                                style={{ marginLeft: 11 }}
                                            />
                                            {isLoading ? (
                                                <div className="py-2 pl-8 text-sm text-muted-foreground">
                                                    Raflar yükleniyor...
                                                </div>
                                            ) : shelves.length === 0 ? (
                                                <div className="py-2 pl-8 text-sm text-muted-foreground">
                                                    Bu depoda henüz raf yok
                                                </div>
                                            ) : (
                                                renderShelfTree(shelves, warehouse.id)
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingShelf ? 'Raf Düzenle' : 'Yeni Raf'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Raf Adı"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Select
                        label="Raf Tipi"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        options={SHELF_TYPES}
                    />
                    {formData.warehouseId && (
                        <Select
                            label="Üst Raf (opsiyonel)"
                            value={formData.parentId}
                            onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                            options={[
                                { value: '', label: 'Kök Raf' },
                                ...getFlatShelves(formData.warehouseId)
                                    .filter(s => s.id !== editingShelf?.id)
                                    .map(s => ({ value: s.id, label: s.name })),
                            ]}
                        />
                    )}
                    <Input
                        label="Global Slot"
                        type="number"
                        value={formData.globalSlot}
                        onChange={(e) => setFormData({ ...formData, globalSlot: parseInt(e.target.value) || 0 })}
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            İptal
                        </Button>
                        <Button type="submit">{editingShelf ? 'Güncelle' : 'Oluştur'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Details Modal */}
            <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title="Raf Detayları">
                {detailsShelf && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-muted-foreground">Raf Adı</label>
                                <p className="font-medium">{detailsShelf.name}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Barkod</label>
                                <p className="font-medium font-mono">{detailsShelf.barcode}</p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Tip</label>
                                <p className="font-medium">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${detailsShelf.type === 'NORMAL' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                        detailsShelf.type === 'DAMAGED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                                            detailsShelf.type === 'PACKING' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                detailsShelf.type === 'PICKING' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                        }`}>
                                        {SHELF_TYPES.find(t => t.value === detailsShelf.type)?.label || detailsShelf.type}
                                    </span>
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Global Slot</label>
                                <p className="font-medium">{detailsShelf.globalSlot}</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-muted-foreground">Yol</label>
                            <p className="font-medium font-mono text-sm bg-muted px-2 py-1 rounded">{detailsShelf.path}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${detailsShelf.isSellable ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-sm">{detailsShelf.isSellable ? 'Satılabilir' : 'Satılamaz'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${detailsShelf.isReservable ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="text-sm">{detailsShelf.isReservable ? 'Rezerve Edilebilir' : 'Rezerve Edilemez'}</span>
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <label className="text-sm text-muted-foreground">Stok Miktarı</label>
                            <p className="text-2xl font-bold">{getTotalStock(detailsShelf).toLocaleString('tr-TR')}</p>
                        </div>

                        {detailsShelf.children && detailsShelf.children.length > 0 && (
                            <div className="border-t pt-4">
                                <label className="text-sm text-muted-foreground">Alt Raflar</label>
                                <p className="font-medium">{detailsShelf.children.length} adet</p>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                                Kapat
                            </Button>
                            <Button onClick={() => {
                                setIsDetailsOpen(false);
                                handleEdit(detailsShelf);
                            }}>
                                Düzenle
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Transfer Modal */}
            <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Stok Transferi">
                <div className="space-y-4">
                    <div>
                        <Select
                            label="Kaynak Raf"
                            value={transferFormData.fromShelfId}
                            onChange={(e) => {
                                const newId = e.target.value;
                                setTransferFormData({ ...transferFormData, fromShelfId: newId, productId: '', quantity: 0 });
                                if (newId) fetchSourceStocks(newId);
                                else setSourceStocks([]);
                            }}
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...globalShelves
                                    .filter((s: Shelf) => s.type !== 'WAREHOUSE' && s.stocks && s.stocks.length > 0 && s.stocks[0].quantity > 0)
                                    .map((s: Shelf) => ({ value: s.id, label: s.name + (s.barcode ? ` [${s.barcode}]` : '') }))
                                    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
                            ]}
                        />
                    </div>

                    <div>
                        <Select
                            label="Ürün Seçin"
                            value={transferFormData.productId}
                            onChange={(e) => setTransferFormData({ ...transferFormData, productId: e.target.value })}
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...sourceStocks.map((s: any) => ({
                                    value: s.productId,
                                    label: `${s.product?.name} (Mevcut: ${s.quantity})`
                                }))
                            ]}
                            disabled={!transferFormData.fromShelfId || sourceStocks.length === 0}
                        />
                    </div>

                    <div>
                        <Select
                            label="Hedef Raf"
                            value={transferFormData.toShelfId}
                            onChange={(e) => setTransferFormData({ ...transferFormData, toShelfId: e.target.value })}
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...globalShelves
                                    .filter((s: Shelf) => s.id !== transferFormData.fromShelfId && s.type !== 'WAREHOUSE')
                                    .map((s: Shelf) => ({ value: s.id, label: s.name + (s.barcode ? ` [${s.barcode}]` : '') }))
                                    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label))
                            ]}
                        />
                    </div>

                    <div>
                        <Input
                            label="Transfer Miktarı"
                            type="number"
                            value={transferFormData.quantity}
                            onChange={(e) => setTransferFormData({ ...transferFormData, quantity: parseInt(e.target.value) || 0 })}
                            min={1}
                        />
                        {sourceStocks.find(s => s.productId === transferFormData.productId) && (
                            <div className="flex items-center justify-between mt-1 px-1">
                                <span className="text-xs text-muted-foreground">
                                    Mevcut: {sourceStocks.find(s => s.productId === transferFormData.productId)?.quantity}
                                </span>
                                <Button
                                    variant="ghost"
                                    className="h-auto p-0 text-xs text-primary hover:bg-transparent hover:underline"
                                    onClick={() => {
                                        const stock = sourceStocks.find(s => s.productId === transferFormData.productId);
                                        if (stock) {
                                            setTransferFormData({ ...transferFormData, quantity: stock.quantity });
                                        }
                                    }}
                                >
                                    Hepsini Seç
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>İptal</Button>
                        <Button onClick={handleTransfer}>Transfer Et</Button>
                    </div>
                </div>
            </Modal>
        </div >
    );
}
