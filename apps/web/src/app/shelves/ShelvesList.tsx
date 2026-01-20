'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from '@/components/ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
    ChevronRight,
    ChevronDown,
    Search,
    Plus,
    Pencil,
    Trash2,
    ArrowRightLeft,
    Warehouse,
    FolderOpen,
    Folder,
    Package,
    Loader2,
    Printer,
    ChevronsUpDown,
    X,
    Check,
    PanelLeftClose,
    PanelLeft,
    Upload,
    FileSpreadsheet,
    Download,
} from 'lucide-react';

const isServer = typeof window === 'undefined';
const API_URL = isServer
    ? (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api')
    : '/api';

interface StockItem {
    quantity: number;
    productId: string;
    product?: { id?: string; name: string; barcode: string; sku?: string };
}

interface Shelf {
    id: string;
    name: string;
    barcode: string;
    type: string;
    warehouseId: string;
    parentId: string | null;
    path: string;
    globalSlot: number;
    rafId?: number;
    isSellable: boolean;
    isReservable: boolean;
    children?: Shelf[];
    warehouse?: { name: string };
    stocks?: StockItem[];
}

interface WarehouseType {
    id: string;
    name: string;
    address?: string;
}

interface ProductItem {
    id: string;
    name: string;
    barcode: string;
    sku?: string;
}

type SelectedItem =
    | { type: 'warehouse'; data: WarehouseType }
    | { type: 'shelf'; data: Shelf; warehouseId: string };

const SHELF_TYPES = [
    { value: 'NORMAL', label: 'Normal', defaultSellable: true },
    { value: 'DAMAGED', label: 'Hasarlı', defaultSellable: false },
    { value: 'PACKING', label: 'Paketleme', defaultSellable: false },
    { value: 'PICKING', label: 'Toplama', defaultSellable: true },
    { value: 'RECEIVING', label: 'Mal Kabul', defaultSellable: false },
    { value: 'RETURN', label: 'İade', defaultSellable: false },
    { value: 'RETURN_DAMAGED', label: 'İade Hasarlı', defaultSellable: false },
];

export function ShelvesList() {
    const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
    const [shelvesMap, setShelvesMap] = useState<Record<string, Shelf[]>>({});
    const [loading, setLoading] = useState(true);
    const [loadingWarehouse, setLoadingWarehouse] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShelf, setEditingShelf] = useState<Shelf | null>(null);
    const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(new Set());
    const [expandedShelves, setExpandedShelves] = useState<Set<string>>(new Set());
    const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [shelfStocks, setShelfStocks] = useState<Shelf['stocks']>([]);
    const [loadingStocks, setLoadingStocks] = useState(false);
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [productSearchResults, setProductSearchResults] = useState<Array<{ shelf: Shelf; warehouse: WarehouseType; quantity: number; product: { name: string; barcode: string } }>>([]);
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [searchingProduct, setSearchingProduct] = useState(false);
    const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<ProductItem[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productComboOpen, setProductComboOpen] = useState(false);
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
    const [stockSearchQuery, setStockSearchQuery] = useState('');

    // Excel Import states
    const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);
    const [excelImportWarehouseId, setExcelImportWarehouseId] = useState('');
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [excelImporting, setExcelImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number; updated: number; errors: string[] } | null>(null);

    const { toast } = useToast();

    const filteredStocks = useMemo(() => {
        if (!shelfStocks || shelfStocks.length === 0) return [];
        if (!stockSearchQuery) return shelfStocks;
        const query = stockSearchQuery.toLowerCase();
        return shelfStocks.filter((stock: StockItem) =>
            stock.product?.name?.toLowerCase().includes(query) ||
            stock.product?.barcode?.toLowerCase().includes(query) ||
            stock.product?.sku?.toLowerCase().includes(query)
        );
    }, [shelfStocks, stockSearchQuery]);

    const [formData, setFormData] = useState({
        name: '',
        type: 'NORMAL',
        parentId: '',
        globalSlot: 0,
        warehouseId: '',
        isSellable: true,
    });
    const [shelfTypeComboOpen, setShelfTypeComboOpen] = useState(false);
    const [parentShelfComboOpen, setParentShelfComboOpen] = useState(false);

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [sourceStocks, setSourceStocks] = useState<Shelf['stocks']>([]);
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
        } catch {
            toast({ variant: 'destructive', title: 'Hata', description: 'Depolar yüklenemedi' });
        } finally {
            setLoading(false);
        }
    };

    const fetchingRef = useRef<Set<string>>(new Set());
    const shelvesMapRef = useRef(shelvesMap);
    shelvesMapRef.current = shelvesMap;

    const fetchWarehouseShelves = async (warehouseId: string, forceRefresh = false): Promise<Shelf[] | null> => {
        if (fetchingRef.current.has(warehouseId)) return null;
        if (!forceRefresh && shelvesMapRef.current[warehouseId] !== undefined) {
            return shelvesMapRef.current[warehouseId];
        }

        fetchingRef.current.add(warehouseId);
        setLoadingWarehouse(warehouseId);

        try {
            const res = await fetch(`${API_URL}/shelves/tree/${warehouseId}`, { credentials: 'include' });
            const json = await res.json();
            const shelves = Array.isArray(json) ? json : (json.data || []);
            setShelvesMap(prev => ({
                ...prev,
                [warehouseId]: shelves,
            }));
            return shelves;
        } catch {
            toast({ variant: 'destructive', title: 'Hata', description: 'Raflar yüklenemedi' });
            return null;
        } finally {
            fetchingRef.current.delete(warehouseId);
            setLoadingWarehouse(null);
        }
    };

    const refreshWarehouseShelves = (warehouseId: string) => {
        return fetchWarehouseShelves(warehouseId, true);
    };

    const fetchShelfStocks = async (shelfId: string) => {
        setLoadingStocks(true);
        try {
            const res = await fetch(`${API_URL}/shelves/${shelfId}/stock`, { credentials: 'include' });
            const json = await res.json();
            const data = json.data || json;
            setShelfStocks(Array.isArray(data) ? data : []);
        } catch {
            setShelfStocks([]);
        } finally {
            setLoadingStocks(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        setStockSearchQuery('');
        if (selectedItem?.type === 'shelf') {
            fetchShelfStocks(selectedItem.data.id);
        } else {
            setShelfStocks([]);
        }
    }, [selectedItem]);

    const toggleWarehouse = async (warehouseId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        const newExpanded = new Set(expandedWarehouses);

        if (newExpanded.has(warehouseId)) {
            newExpanded.delete(warehouseId);
        } else {
            newExpanded.add(warehouseId);
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

    const selectWarehouse = (warehouse: WarehouseType) => {
        setSelectedItem({ type: 'warehouse', data: warehouse });
        setIsMobilePanelOpen(true);
        if (!expandedWarehouses.has(warehouse.id)) {
            toggleWarehouse(warehouse.id);
        }
    };

    const selectShelf = (shelf: Shelf, warehouseId: string) => {
        setSelectedItem({ type: 'shelf', data: shelf, warehouseId });
        setIsMobilePanelOpen(true);
    };

    const handleCreate = (warehouseId?: string, parentId?: string) => {
        setEditingShelf(null);
        setFormData({
            name: '',
            type: 'NORMAL',
            parentId: parentId || '',
            globalSlot: 0,
            warehouseId: warehouseId || '',
            isSellable: true,
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
            isSellable: shelf.isSellable ?? true,
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
            toast({ title: 'Başarılı', description: editingShelf ? 'Raf güncellendi' : 'Raf oluşturuldu', variant: 'success' });
            setIsModalOpen(false);

            if (formData.warehouseId) {
                setExpandedWarehouses(prev => {
                    const next = new Set(prev);
                    next.add(formData.warehouseId);
                    return next;
                });
                const clearedMap = { ...shelvesMapRef.current };
                delete clearedMap[formData.warehouseId];
                shelvesMapRef.current = clearedMap;
                setShelvesMap(clearedMap);
                await refreshWarehouseShelves(formData.warehouseId);
            }
        } catch {
            toast({ variant: 'destructive', title: 'Hata', description: 'İşlem başarısız' });
        }
    };

    const handleDelete = async (id: string, warehouseId: string) => {
        if (!confirm('Bu rafı silmek istediğinize emin misiniz?')) return;
        try {
            await fetch(`${API_URL}/shelves/${id}`, { method: 'DELETE', credentials: 'include' });
            toast({ title: 'Başarılı', description: 'Raf silindi', variant: 'success' });
            setSelectedItem(null);
            await refreshWarehouseShelves(warehouseId);
        } catch {
            toast({ variant: 'destructive', title: 'Hata', description: 'Silme başarısız' });
        }
    };

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
        } catch {
            console.error('Raf listesi alınamadı');
        }
    };

    const fetchSourceStocks = async (shelfId: string) => {
        try {
            const res = await fetch(`${API_URL}/shelves/${shelfId}/stock`, { credentials: 'include' });
            const json = await res.json();
            const data = json.data || json;
            setSourceStocks(Array.isArray(data) ? data : []);
        } catch {
            toast({ variant: 'destructive', title: 'Hata', description: 'Raf stok bilgisi alınamadı' });
            setSourceStocks([]);
        }
    };

    const openTransferModal = async (preselectedShelfId?: string, preselectedProductId?: string) => {
        setIsTransferModalOpen(true);
        fetchGlobalShelves();

        if (preselectedShelfId) {
            setTransferFormData({
                fromShelfId: preselectedShelfId,
                toShelfId: '',
                productId: preselectedProductId || '',
                quantity: 0
            });
            await fetchSourceStocks(preselectedShelfId);
        } else {
            setTransferFormData({ fromShelfId: '', toShelfId: '', productId: '', quantity: 0 });
            setSourceStocks([]);
        }
    };

    const handleTransfer = async () => {
        if (!transferFormData.fromShelfId || !transferFormData.toShelfId || !transferFormData.productId || transferFormData.quantity <= 0) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Lütfen tüm alanları doldurun' });
            return;
        }

        if (transferFormData.fromShelfId === transferFormData.toShelfId) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Kaynak ve hedef raf aynı olamaz' });
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

            toast({ title: 'Başarılı', description: 'Transfer başarılı', variant: 'success' });
            setIsTransferModalOpen(false);

            const allShelves = getAllShelves();
            const sourceShelf = allShelves.find(s => s.id === transferFormData.fromShelfId);
            if (sourceShelf?.warehouseId) {
                await fetchWarehouseShelves(sourceShelf.warehouseId, true);
            }
            const targetShelf = allShelves.find(s => s.id === transferFormData.toShelfId);
            if (targetShelf?.warehouseId && targetShelf.warehouseId !== sourceShelf?.warehouseId) {
                await fetchWarehouseShelves(targetShelf.warehouseId, true);
            }

            if (selectedItem?.type === 'shelf') {
                fetchShelfStocks(selectedItem.data.id);
            }
        } catch {
            toast({ variant: 'destructive', title: 'Hata', description: 'Transfer başarısız' });
        }
    };

    const fetchAllProducts = useCallback(async () => {
        if (allProducts.length > 0 || productsLoading) return;
        setProductsLoading(true);
        try {
            const res = await fetch(`${API_URL}/products?limit=1000`, { credentials: 'include' });
            const json = await res.json();
            const data = json.data?.items || json.data || json.items || [];
            setAllProducts(Array.isArray(data) ? data : []);
        } catch {
            toast({ variant: 'destructive', title: 'Hata', description: 'Ürünler yüklenemedi' });
        } finally {
            setProductsLoading(false);
        }
    }, [allProducts.length, productsLoading, toast]);

    useEffect(() => {
        if (isProductSearchOpen && allProducts.length === 0) {
            fetchAllProducts();
        }
    }, [isProductSearchOpen, allProducts.length, fetchAllProducts]);

    const searchProductInShelves = async (productIds?: string[]) => {
        const ids = productIds || selectedProducts.map(p => p.id);
        if (ids.length === 0) {
            setProductSearchResults([]);
            return;
        }

        setSearchingProduct(true);
        try {
            const res = await fetch(`${API_URL}/shelves/search-product-by-ids`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ productIds: ids })
            });
            const json = await res.json();
            const data = json.data || json;
            setProductSearchResults(Array.isArray(data) ? data : []);
        } catch {
            setProductSearchResults([]);
            toast({ variant: 'destructive', title: 'Hata', description: 'Ürün araması başarısız' });
        } finally {
            setSearchingProduct(false);
        }
    };

    const toggleProductSelection = (product: ProductItem) => {
        setSelectedProducts(prev => {
            const isSelected = prev.some(p => p.id === product.id);
            if (isSelected) {
                return prev.filter(p => p.id !== product.id);
            }
            return [...prev, product];
        });
    };

    const removeSelectedProduct = (productId: string) => {
        setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    };

    const goToShelfWithProduct = async (shelfId: string, warehouseId: string) => {
        const warehouse = warehouses.find(w => w.id === warehouseId);
        if (!warehouse) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Depo bulunamadı' });
            return;
        }

        setIsProductSearchOpen(false);
        setProductSearchQuery('');
        setProductSearchResults([]);
        setSelectedProducts([]);
        setProductComboOpen(false);

        setExpandedWarehouses(prev => {
            const next = new Set(prev);
            next.add(warehouseId);
            return next;
        });

        const shelves = await fetchWarehouseShelves(warehouseId);

        const findShelf = (items: Shelf[]): Shelf | null => {
            for (const shelf of items) {
                if (shelf.id === shelfId) return shelf;
                if (shelf.children) {
                    const found = findShelf(shelf.children);
                    if (found) return found;
                }
            }
            return null;
        };

        const findParentIds = (items: Shelf[], targetId: string, parents: string[] = []): string[] => {
            for (const shelf of items) {
                if (shelf.id === targetId) return parents;
                if (shelf.children) {
                    const result = findParentIds(shelf.children, targetId, [...parents, shelf.id]);
                    if (result.length > 0 || shelf.children.some(c => c.id === targetId)) {
                        return result.length > 0 ? result : [...parents, shelf.id];
                    }
                }
            }
            return [];
        };

        const shelvesToSearch = shelves || shelvesMap[warehouseId] || [];
        const shelf = findShelf(shelvesToSearch);

        if (shelf) {
            const parentIds = findParentIds(shelvesToSearch, shelfId);
            setExpandedShelves(prev => {
                const next = new Set(prev);
                parentIds.forEach(id => next.add(id));
                return next;
            });

            selectShelf(shelf, warehouseId);
            toast({ title: 'Raf bulundu', description: `${shelf.name} rafına gidildi` });
        } else {
            toast({ variant: 'destructive', title: 'Hata', description: 'Raf bulunamadı' });
        }
    };

    const getTotalStock = (shelf: Shelf): number => {
        let total = shelf.stocks?.reduce((sum, s) => sum + s.quantity, 0) || 0;
        if (shelf.children) {
            shelf.children.forEach(child => {
                total += getTotalStock(child);
            });
        }
        return total;
    };

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

    const filterItems = (items: Shelf[], query: string): Shelf[] => {
        if (!query) return items;
        const lowerQuery = query.toLowerCase();

        return items.reduce<Shelf[]>((acc, shelf) => {
            const matchesName = shelf.name.toLowerCase().includes(lowerQuery);
            const matchesBarcode = shelf.barcode?.toLowerCase().includes(lowerQuery);
            const filteredChildren = shelf.children ? filterItems(shelf.children, query) : [];

            if (matchesName || matchesBarcode || filteredChildren.length > 0) {
                acc.push({
                    ...shelf,
                    children: filteredChildren.length > 0 ? filteredChildren : shelf.children
                });
            }
            return acc;
        }, []);
    };

    const getSelectedWarehouseId = (): string | null => {
        if (!selectedItem) return null;
        if (selectedItem.type === 'warehouse') return selectedItem.data.id;
        return selectedItem.warehouseId;
    };

    const getSelectedShelf = (): Shelf | null => {
        if (selectedItem?.type === 'shelf') return selectedItem.data;
        return null;
    };

    const getShelfTypeBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (type) {
            case 'NORMAL': return 'default';
            case 'DAMAGED': return 'destructive';
            default: return 'secondary';
        }
    };

    const renderTreeItem = (shelf: Shelf, warehouseId: string, level = 0) => {
        const hasChildren = shelf.children && shelf.children.length > 0;
        const isExpanded = expandedShelves.has(shelf.id);
        const isSelected = selectedItem?.type === 'shelf' && selectedItem.data.id === shelf.id;
        const totalStock = getTotalStock(shelf);

        return (
            <div key={shelf.id}>
                <div
                    className={`flex items-center py-2 px-2 cursor-pointer rounded-md text-sm transition-colors
                        ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    onClick={() => selectShelf(shelf, warehouseId)}
                    style={{ paddingLeft: 8 + level * 20 }}
                >
                    {hasChildren ? (
                        <button
                            onClick={(e) => toggleShelf(shelf.id, e)}
                            className="w-5 h-5 flex items-center justify-center mr-1 flex-shrink-0 hover:bg-muted-foreground/10 rounded"
                        >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    ) : (
                        <div className="w-5 mr-1 flex-shrink-0" />
                    )}
                    {hasChildren && isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    ) : (
                        <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    )}
                    <span className="ml-2 truncate flex-1 font-medium">{shelf.name}</span>
                    <Badge
                        variant="outline"
                        className={`ml-2 text-xs flex-shrink-0 ${isSelected ? 'border-primary-foreground/50 text-primary-foreground' : ''}`}
                    >
                        {totalStock.toLocaleString('tr-TR')}
                    </Badge>
                </div>

                {hasChildren && isExpanded && (
                    <div>
                        {shelf.children!.map(child => renderTreeItem(child, warehouseId, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    const LeftPanel = () => (
        <div className={`flex-shrink-0 border-r border-border flex flex-col h-full bg-card transition-all duration-300 ${isLeftPanelCollapsed ? 'w-12' : 'w-full md:w-80 lg:w-96'}`}>
            {isLeftPanelCollapsed ? (
                <div className="flex flex-col items-center py-4 gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsLeftPanelCollapsed(false)}
                        title="Paneli Aç"
                    >
                        <PanelLeft className="w-5 h-5" />
                    </Button>
                </div>
            ) : (
                <>
                    <div className="p-3 border-b border-border flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Depo veya raf ara..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-9"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsLeftPanelCollapsed(true)}
                            title="Paneli Kapat"
                            className="flex-shrink-0"
                        >
                            <PanelLeftClose className="w-5 h-5" />
                        </Button>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-3">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                </div>
                            ) : warehouses.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>Depo bulunamadı</p>
                                </div>
                            ) : (
                                warehouses.map((warehouse) => {
                                    const isExpanded = expandedWarehouses.has(warehouse.id);
                                    const isSelected = selectedItem?.type === 'warehouse' && selectedItem.data.id === warehouse.id;
                                    const isLoading = loadingWarehouse === warehouse.id;
                                    const shelves = shelvesMap[warehouse.id] || [];
                                    const filteredShelves = filterItems(shelves, searchQuery);

                                    return (
                                        <div key={warehouse.id} className="mb-2">
                                            <div
                                                className={`flex items-center py-2.5 px-3 cursor-pointer rounded-lg text-sm transition-colors
                                            ${isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                                                onClick={() => selectWarehouse(warehouse)}
                                            >
                                                <button
                                                    onClick={(e) => toggleWarehouse(warehouse.id, e)}
                                                    className="w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0"
                                                >
                                                    {isLoading ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : isExpanded ? (
                                                        <ChevronDown className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <Warehouse className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-primary-foreground' : 'text-blue-500'}`} />
                                                <span className="ml-2 font-semibold truncate">{warehouse.name}</span>
                                            </div>

                                            {isExpanded && (
                                                <div className="ml-3 mt-1">
                                                    {isLoading ? (
                                                        <div className="py-3 pl-4 text-sm text-muted-foreground flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Yükleniyor...
                                                        </div>
                                                    ) : filteredShelves.length === 0 ? (
                                                        <div className="py-3 pl-4 text-sm text-muted-foreground">
                                                            {searchQuery ? 'Sonuç bulunamadı' : 'Raf yok'}
                                                        </div>
                                                    ) : (
                                                        filteredShelves.map(shelf => renderTreeItem(shelf, warehouse.id))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-3 border-t border-border">
                        <Button
                            variant="outline"
                            className="w-full"
                            size="sm"
                            onClick={() => {
                                const warehouseId = getSelectedWarehouseId();
                                const parentId = getSelectedShelf()?.id;
                                if (warehouseId) {
                                    handleCreate(warehouseId, parentId);
                                }
                            }}
                            disabled={!getSelectedWarehouseId()}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Yeni Raf
                        </Button>
                    </div>
                </>
            )}
        </div>
    );

    const shelf = getSelectedShelf();
    const rightPanelWarehouseId = getSelectedWarehouseId();
    const rightPanelWarehouse = warehouses.find(w => w.id === rightPanelWarehouseId);

    const rightPanelContent = useMemo(() => {
        if (!selectedItem) {
            return (
                <div className="flex-1 flex items-center justify-center bg-muted/30">
                    <div className="text-center text-muted-foreground">
                        <Warehouse className="w-20 h-20 mx-auto mb-4 opacity-20" />
                        <p className="text-xl font-medium">Bir depo veya raf seçin</p>
                        <p className="text-sm mt-2">Detayları görmek için sol panelden seçim yapın</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-card">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/shelves">Raflar</BreadcrumbLink>
                            </BreadcrumbItem>
                            {rightPanelWarehouse && (
                                <>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        {selectedItem.type === 'warehouse' ? (
                                            <BreadcrumbPage>{rightPanelWarehouse.name}</BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink
                                                className="cursor-pointer"
                                                onClick={() => selectWarehouse(rightPanelWarehouse)}
                                            >
                                                {rightPanelWarehouse.name}
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                </>
                            )}
                            {selectedItem.type === 'shelf' && (
                                <>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>{selectedItem.data.name}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </>
                            )}
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="flex items-center justify-between mt-4">
                        <h2 className="text-2xl font-bold">
                            {selectedItem.type === 'warehouse' ? selectedItem.data.name : selectedItem.data.name}
                        </h2>

                        {shelf && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleEdit(shelf)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Düzenle
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const data = encodeURIComponent(JSON.stringify([{
                                            id: shelf.id,
                                            name: shelf.name,
                                            barcode: shelf.barcode,
                                            globalSlot: shelf.globalSlot,
                                            rafId: shelf.rafId,
                                        }]));
                                        window.open(`/shelves/print?data=${data}`, '_blank');
                                    }}
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Yazdır
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(shelf.id, rightPanelWarehouseId!)}
                                    className="text-destructive hover:text-destructive"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Sil
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <ScrollArea className="flex-1 p-4" style={{ overflowAnchor: 'none' }}>
                    {selectedItem.type === 'warehouse' ? (
                        <div className="space-y-6">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-5">
                                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                                            <Warehouse className="w-9 h-9 text-blue-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-xl">{selectedItem.data.name}</h3>
                                            {selectedItem.data.address && (
                                                <p className="text-muted-foreground mt-1">{selectedItem.data.address}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-4">
                                                <div className="bg-muted rounded-lg px-4 py-2">
                                                    <span className="text-sm text-muted-foreground">Toplam Raf</span>
                                                    <p className="font-bold text-lg">{(shelvesMap[selectedItem.data.id] || []).length}</p>
                                                </div>
                                                <div className="bg-primary/10 rounded-lg px-4 py-2">
                                                    <span className="text-sm text-muted-foreground">Toplam Stok</span>
                                                    <p className="font-bold text-lg text-primary">
                                                        {(shelvesMap[selectedItem.data.id] || []).reduce((sum, s) => sum + getTotalStock(s), 0).toLocaleString('tr-TR')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <div>
                                        <CardTitle className="text-lg">Kök Raflar</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">Depodaki ana raf grupları</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCreate(selectedItem.data.id)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Raf Ekle
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {loadingWarehouse === selectedItem.data.id ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    ) : (shelvesMap[selectedItem.data.id] || []).length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Folder className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                            <p>Bu depoda henüz raf yok</p>
                                            <p className="text-sm mt-1">Yukarıdaki butonu kullanarak ilk rafı ekleyin</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {(shelvesMap[selectedItem.data.id] || []).map(shelf => (
                                                <Card
                                                    key={shelf.id}
                                                    className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                                                    onClick={() => selectShelf(shelf, selectedItem.data.id)}
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                                                    {shelf.children?.length ? (
                                                                        <FolderOpen className="w-6 h-6 text-amber-500" />
                                                                    ) : (
                                                                        <Folder className="w-6 h-6 text-amber-500" />
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold truncate">{shelf.name}</p>
                                                                    <p className="text-xs text-muted-foreground font-mono">{shelf.barcode}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                                                                <Badge variant={getShelfTypeBadgeVariant(shelf.type)}>
                                                                    {SHELF_TYPES.find(t => t.value === shelf.type)?.label}
                                                                </Badge>
                                                                <span className="text-lg font-bold text-primary">
                                                                    {getTotalStock(shelf).toLocaleString('tr-TR')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                    <CardTitle className="text-lg">Raf Detayları</CardTitle>
                                    <Badge variant={getShelfTypeBadgeVariant(shelf?.type || '')}>
                                        {SHELF_TYPES.find(t => t.value === shelf?.type)?.label || shelf?.type}
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-muted/50 rounded-xl p-4 min-h-[88px]">
                                            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Barkod</span>
                                            <p className="font-mono font-semibold mt-2 text-sm break-all">{shelf?.barcode || '-'}</p>
                                        </div>
                                        <div className="bg-muted/50 rounded-xl p-4 min-h-[88px]">
                                            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Global Slot</span>
                                            <p className="font-semibold mt-2">{shelf?.globalSlot ?? '-'}</p>
                                        </div>
                                        <div className="bg-primary/10 rounded-xl p-4 min-h-[88px]">
                                            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Toplam Stok</span>
                                            <p className="font-bold text-2xl text-primary mt-2">{getTotalStock(shelf!).toLocaleString('tr-TR')}</p>
                                        </div>
                                        <div className="bg-muted/50 rounded-xl p-4 min-h-[88px]">
                                            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Alt Raf</span>
                                            <p className="font-semibold mt-2">{shelf?.children?.length || 0} adet</p>
                                        </div>
                                    </div>

                                    <Separator className="my-4" />

                                    <div className="flex items-center gap-8">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${shelf?.isSellable ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <span className="text-sm font-medium">{shelf?.isSellable ? 'Satılabilir' : 'Satılamaz'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${shelf?.isReservable ? 'bg-green-500' : 'bg-red-500'}`} />
                                            <span className="text-sm font-medium">{shelf?.isReservable ? 'Rezerve Edilebilir' : 'Rezerve Edilemez'}</span>
                                        </div>
                                        {shelf?.path && (
                                            <div className="flex-1 text-right">
                                                <Badge variant="outline" className="font-mono">{shelf.path}</Badge>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {shelf?.children && shelf.children.length > 0 && (
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                        <CardTitle className="text-lg">Alt Raflar ({shelf.children.length})</CardTitle>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCreate(rightPanelWarehouseId!, shelf.id)}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Alt Raf Ekle
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {shelf.children.map(child => (
                                                <Card
                                                    key={child.id}
                                                    className="cursor-pointer hover:shadow-sm transition-all hover:border-primary/50"
                                                    onClick={() => selectShelf(child, rightPanelWarehouseId!)}
                                                >
                                                    <CardContent className="p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Folder className="w-4 h-4 text-amber-500" />
                                                            <span className="font-medium text-sm">{child.name}</span>
                                                        </div>
                                                        <Badge variant="outline">{getTotalStock(child).toLocaleString('tr-TR')}</Badge>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                    <div>
                                        <CardTitle className="text-lg">Bu Rafta ({shelf?.name})</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {shelfStocks?.length || 0} farklı ürün, toplam {shelfStocks?.reduce((sum: number, s: StockItem) => sum + (s.quantity || 0), 0).toLocaleString('tr-TR')} adet
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openTransferModal(shelf?.id)}
                                    >
                                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                                        Transfer
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {shelfStocks && shelfStocks.length > 0 && (
                                        <div className="relative mb-4">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                type="text"
                                                placeholder="Stok ara (isim, barkod, SKU)..."
                                                value={stockSearchQuery}
                                                onChange={(e) => setStockSearchQuery(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                    )}
                                    {loadingStocks ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    ) : !shelfStocks || shelfStocks.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                            <p>Bu rafta stok bulunmuyor</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredStocks.map((stock: StockItem) => (
                                                <Card key={stock.product?.id || stock.productId} className="hover:shadow-sm transition-all group">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                                                    <Package className="w-6 h-6 text-primary" />
                                                                </div>
                                                                <div className="min-w-0 flex-1">
                                                                    <p className="font-semibold truncate">{stock.product?.name || 'Bilinmeyen Ürün'}</p>
                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                        {stock.product?.barcode && (
                                                                            <Badge variant="outline" className="font-mono text-xs">
                                                                                {stock.product.barcode}
                                                                            </Badge>
                                                                        )}
                                                                        {stock.product?.sku && (
                                                                            <span className="text-xs text-muted-foreground">SKU: {stock.product.sku}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <p className="text-2xl font-bold text-primary">{stock.quantity?.toLocaleString('tr-TR')}</p>
                                                                <p className="text-xs text-muted-foreground">adet</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end mt-3">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => openTransferModal(shelf?.id, stock.productId)}
                                                            >
                                                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                                                Transfer
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {!shelf?.children?.length && (
                                <div className="flex justify-center">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleCreate(rightPanelWarehouseId!, shelf?.id)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Alt Raf Ekle
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-4 border-t border-border bg-card flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const allShelves: Array<{ id: string; name: string; barcode: string; globalSlot: number | null; rafId?: number }> = [];
                            const collectShelves = (items: Shelf[]) => {
                                items.forEach(shelf => {
                                    allShelves.push({
                                        id: shelf.id,
                                        name: shelf.name,
                                        barcode: shelf.barcode,
                                        globalSlot: shelf.globalSlot,
                                        rafId: shelf.rafId,
                                    });
                                    if (shelf.children?.length) collectShelves(shelf.children);
                                });
                            };
                            Object.values(shelvesMap).forEach(shelves => {
                                if (shelves?.length) collectShelves(shelves);
                            });
                            if (allShelves.length === 0) {
                                toast({ variant: 'destructive', title: 'Hata', description: 'Yazdırılacak raf bulunamadı' });
                                return;
                            }
                            const data = encodeURIComponent(JSON.stringify(allShelves));
                            window.open(`/shelves/print?data=${data}`, '_blank');
                        }}
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Barkodları Yazdır
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTransferModal()}
                    >
                        <ArrowRightLeft className="w-4 h-4 mr-2" />
                        Genel Transfer
                    </Button>
                </div>
            </div>
        );
    }, [selectedItem, shelf, rightPanelWarehouse, rightPanelWarehouseId, shelfStocks, filteredStocks, loadingStocks, stockSearchQuery, shelvesMap, loadingWarehouse]);

    return (
        <div className="h-[calc(100vh-6rem)]">
            <div className="flex items-center justify-between mb-4">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href="/">Ana Sayfa</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Raflar</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setIsExcelImportOpen(true);
                            setExcelFile(null);
                            setExcelImportWarehouseId('');
                            setImportResult(null);
                        }}
                    >
                        <Upload className="h-4 w-4 mr-2" />
                        Excel İçe Aktar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsProductSearchOpen(true)}
                    >
                        <Search className="h-4 w-4 mr-2" />
                        Ürün Ara
                    </Button>
                    <Button
                        variant="outline"
                        className="md:hidden"
                        onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
                    >
                        {isMobilePanelOpen ? 'Ağaç Görünümü' : 'Detay Görünümü'}
                    </Button>
                </div>
            </div>

            <Card className="h-[calc(100%-3.5rem)] overflow-hidden">
                <div className="flex h-full">
                    <div className={`${isMobilePanelOpen ? 'hidden md:flex' : 'flex'}`}>
                        <LeftPanel />
                    </div>
                    <div className={`${isMobilePanelOpen ? 'flex' : 'hidden md:flex'} flex-1`}>
                        {rightPanelContent}
                    </div>
                </div>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingShelf ? 'Raf Düzenle' : 'Yeni Raf'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Raf Adı</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="Raf adı girin"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Raf Tipi</Label>
                            <Popover open={shelfTypeComboOpen} onOpenChange={setShelfTypeComboOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={shelfTypeComboOpen}
                                        className="w-full justify-between"
                                    >
                                        {SHELF_TYPES.find(t => t.value === formData.type)?.label || 'Raf tipi seçin'}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Raf tipi ara..." />
                                        <CommandList>
                                            <CommandEmpty>Bulunamadı.</CommandEmpty>
                                            <CommandGroup>
                                                {SHELF_TYPES.map(t => (
                                                    <CommandItem
                                                        key={t.value}
                                                        value={t.label}
                                                        onSelect={() => {
                                                            setFormData({
                                                                ...formData,
                                                                type: t.value,
                                                                isSellable: t.defaultSellable
                                                            });
                                                            setShelfTypeComboOpen(false);
                                                        }}
                                                    >
                                                        <Check className={`mr-2 h-4 w-4 ${formData.type === t.value ? 'opacity-100' : 'opacity-0'}`} />
                                                        {t.label}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Satılabilir Stok</Label>
                                <p className="text-xs text-muted-foreground">Bu raftaki ürünler satışa uygun mu?</p>
                            </div>
                            <Switch
                                checked={formData.isSellable}
                                onCheckedChange={(checked) => setFormData({ ...formData, isSellable: checked })}
                            />
                        </div>
                        {formData.warehouseId && (
                            <div className="space-y-2">
                                <Label>Üst Raf (opsiyonel)</Label>
                                <Popover open={parentShelfComboOpen} onOpenChange={setParentShelfComboOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={parentShelfComboOpen}
                                            className="w-full justify-between"
                                        >
                                            {formData.parentId
                                                ? getFlatShelves(formData.warehouseId).find(s => s.id === formData.parentId)?.name || 'Kök Raf'
                                                : 'Kök Raf'
                                            }
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Üst raf ara..." />
                                            <CommandList>
                                                <CommandEmpty>Bulunamadı.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        value="Kök Raf"
                                                        onSelect={() => {
                                                            setFormData({ ...formData, parentId: '' });
                                                            setParentShelfComboOpen(false);
                                                        }}
                                                    >
                                                        <Check className={`mr-2 h-4 w-4 ${!formData.parentId ? 'opacity-100' : 'opacity-0'}`} />
                                                        Kök Raf
                                                    </CommandItem>
                                                    {getFlatShelves(formData.warehouseId)
                                                        .filter(s => s.id !== editingShelf?.id)
                                                        .map(s => (
                                                            <CommandItem
                                                                key={s.id}
                                                                value={s.name}
                                                                onSelect={() => {
                                                                    setFormData({ ...formData, parentId: s.id });
                                                                    setParentShelfComboOpen(false);
                                                                }}
                                                            >
                                                                <Check className={`mr-2 h-4 w-4 ${formData.parentId === s.id ? 'opacity-100' : 'opacity-0'}`} />
                                                                {s.name}
                                                            </CommandItem>
                                                        ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Global Slot</Label>
                            <Input
                                type="number"
                                value={formData.globalSlot}
                                onChange={(e) => setFormData({ ...formData, globalSlot: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                İptal
                            </Button>
                            <Button type="submit">{editingShelf ? 'Güncelle' : 'Oluştur'}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Stok Transferi</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Kaynak Raf</Label>
                            <Select
                                value={transferFormData.fromShelfId}
                                onValueChange={(v) => {
                                    setTransferFormData({ ...transferFormData, fromShelfId: v, productId: '', quantity: 0 });
                                    if (v) fetchSourceStocks(v);
                                    else setSourceStocks([]);
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {globalShelves
                                        .filter((s: Shelf) => s.type !== 'WAREHOUSE')
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map((s: Shelf) => (
                                            <SelectItem key={s.id} value={s.id} className="truncate">
                                                <span className="truncate">{s.name} {s.barcode && `[${s.barcode}]`}</span>
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Ürün Seçin</Label>
                            <Select
                                value={transferFormData.productId}
                                onValueChange={(v) => setTransferFormData({ ...transferFormData, productId: v })}
                                disabled={!transferFormData.fromShelfId || !sourceStocks?.length}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {(sourceStocks || []).map((s: StockItem) => (
                                        <SelectItem key={s.productId} value={s.productId}>
                                            <span className="truncate">{s.product?.name}</span>
                                            <span className="ml-2 text-muted-foreground">(Mevcut: {s.quantity})</span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Hedef Raf</Label>
                            <Select
                                value={transferFormData.toShelfId}
                                onValueChange={(v) => setTransferFormData({ ...transferFormData, toShelfId: v })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seçiniz" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {globalShelves
                                        .filter((s: Shelf) => s.id !== transferFormData.fromShelfId && s.type !== 'WAREHOUSE')
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map((s: Shelf) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                <span className="truncate">{s.name} {s.barcode && `[${s.barcode}]`}</span>
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Transfer Miktarı</Label>
                            <Input
                                type="number"
                                value={transferFormData.quantity}
                                onChange={(e) => setTransferFormData({ ...transferFormData, quantity: parseInt(e.target.value) || 0 })}
                                min={1}
                                className="w-full"
                            />
                            {sourceStocks?.find((s: StockItem) => s.productId === transferFormData.productId) && (
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-sm text-muted-foreground">
                                        Mevcut: {sourceStocks.find((s: StockItem) => s.productId === transferFormData.productId)?.quantity}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="h-auto p-0 text-sm"
                                        onClick={() => {
                                            const stock = sourceStocks.find((s: StockItem) => s.productId === transferFormData.productId);
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

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>İptal</Button>
                            <Button onClick={handleTransfer}>Transfer Et</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isProductSearchOpen} onOpenChange={setIsProductSearchOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Ürün Ara - Hangi Raflarda?</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Ürün Seçin</Label>
                            <Popover open={productComboOpen} onOpenChange={setProductComboOpen} modal={true}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={productComboOpen}
                                        className="w-full justify-between h-auto min-h-10"
                                    >
                                        {selectedProducts.length === 0 ? (
                                            <span className="text-muted-foreground">Ürün seçin...</span>
                                        ) : (
                                            <span className="text-sm">{selectedProducts.length} ürün seçildi</span>
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0" align="start" sideOffset={4}>
                                    <Command shouldFilter={true}>
                                        <CommandInput placeholder="Ürün ara..." />
                                        <CommandList>
                                            <CommandEmpty>
                                                {productsLoading ? 'Yükleniyor...' : 'Ürün bulunamadı.'}
                                            </CommandEmpty>
                                            <CommandGroup className="max-h-64 overflow-y-auto">
                                                {allProducts.map((product) => {
                                                    const isSelected = selectedProducts.some(p => p.id === product.id);
                                                    return (
                                                        <CommandItem
                                                            key={product.id}
                                                            value={`${product.name} ${product.barcode} ${product.sku || ''}`}
                                                            onSelect={() => {
                                                                toggleProductSelection(product);
                                                            }}
                                                            className="cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-3 w-full">
                                                                <div className={`flex items-center justify-center w-5 h-5 rounded border ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                                                                    {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm truncate">{product.name}</p>
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        {product.barcode} {product.sku && `• ${product.sku}`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </CommandItem>
                                                    );
                                                })}
                                            </CommandGroup>
                                        </CommandList>
                                        {selectedProducts.length > 0 && (
                                            <div className="border-t p-2">
                                                <Button
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => setProductComboOpen(false)}
                                                >
                                                    Tamam ({selectedProducts.length} seçildi)
                                                </Button>
                                            </div>
                                        )}
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {selectedProducts.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                                {selectedProducts.map((product) => (
                                    <Badge key={product.id} variant="secondary" className="gap-1">
                                        <span className="truncate max-w-32">{product.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeSelectedProduct(product.id)}
                                            className="hover:bg-muted rounded-full"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}

                        <Button
                            onClick={() => searchProductInShelves()}
                            className="w-full"
                            disabled={searchingProduct || selectedProducts.length === 0}
                        >
                            {searchingProduct ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Aranıyor...
                                </>
                            ) : (
                                <>
                                    <Search className="h-4 w-4 mr-2" />
                                    Raflarda Ara
                                </>
                            )}
                        </Button>

                        {productSearchResults.length > 0 && (
                            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                                {productSearchResults.map((result, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                                        onClick={() => goToShelfWithProduct(result.shelf.id, result.warehouse.id)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">
                                                    {result.product?.name || 'Bilinmeyen Ürün'}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {result.product?.barcode && `Barkod: ${result.product.barcode}`}
                                                </p>
                                                <p className="text-xs text-primary mt-1">
                                                    <Warehouse className="h-3 w-3 inline mr-1" />
                                                    {result.warehouse?.name} → {result.shelf?.name}
                                                </p>
                                            </div>
                                            <Badge variant="secondary" className="shrink-0">
                                                {result.quantity} adet
                                            </Badge>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {productSearchResults.length === 0 && selectedProducts.length > 0 && !searchingProduct && (
                            <div className="text-center py-4 text-muted-foreground">
                                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Raflarda stok bulunamadı</p>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Excel Import Dialog */}
            <Dialog open={isExcelImportOpen} onOpenChange={setIsExcelImportOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5" />
                            Excel&apos;den Raf İçe Aktar
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Depo Seçin</Label>
                            <Select
                                value={excelImportWarehouseId}
                                onValueChange={setExcelImportWarehouseId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Hangi depoya aktarılacak?" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((warehouse) => (
                                        <SelectItem key={warehouse.id} value={warehouse.id}>
                                            <div className="flex items-center gap-2">
                                                <Warehouse className="h-4 w-4" />
                                                {warehouse.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Excel Dosyası</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setExcelFile(file);
                                            setImportResult(null);
                                        }
                                    }}
                                    className="hidden"
                                    id="excel-file-input"
                                />
                                <label htmlFor="excel-file-input" className="cursor-pointer">
                                    {excelFile ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <FileSpreadsheet className="h-8 w-8 text-green-500" />
                                            <span className="font-medium">{excelFile.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">
                                                Dosya seçmek için tıklayın veya sürükleyin
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                .xlsx veya .xls
                                            </p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={async () => {
                                    try {
                                        const res = await fetch(`${API_URL}/shelves/import/template`, {
                                            credentials: 'include',
                                        });
                                        if (!res.ok) throw new Error('Template indirilemedi');
                                        const blob = await res.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = 'raf_sablonu.xlsx';
                                        a.click();
                                        window.URL.revokeObjectURL(url);
                                    } catch {
                                        toast({ variant: 'destructive', title: 'Hata', description: 'Şablon indirilemedi' });
                                    }
                                }}
                            >
                                <Download className="h-3 w-3 mr-1" />
                                Örnek şablonu indir
                            </Button>
                        </div>

                        {importResult && (
                            <div className="rounded-lg border p-4 space-y-2">
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Check className="h-4 w-4 text-green-500" />
                                        <span className="font-medium">{importResult.success}</span>
                                        <span className="text-muted-foreground">yeni</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Pencil className="h-4 w-4 text-blue-500" />
                                        <span className="font-medium">{importResult.updated}</span>
                                        <span className="text-muted-foreground">güncellendi</span>
                                    </div>
                                </div>
                                {importResult.errors.length > 0 && (
                                    <div className="mt-2 text-sm">
                                        <p className="font-medium text-destructive">Hatalar:</p>
                                        <ul className="list-disc list-inside text-muted-foreground max-h-32 overflow-y-auto">
                                            {importResult.errors.map((err, idx) => (
                                                <li key={idx}>{err}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsExcelImportOpen(false)}
                            >
                                İptal
                            </Button>
                            <Button
                                disabled={!excelFile || !excelImportWarehouseId || excelImporting}
                                onClick={async () => {
                                    if (!excelFile || !excelImportWarehouseId) return;

                                    setExcelImporting(true);
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', excelFile);
                                        formData.append('warehouseId', excelImportWarehouseId);

                                        const res = await fetch(`${API_URL}/shelves/import`, {
                                            method: 'POST',
                                            credentials: 'include',
                                            body: formData,
                                        });

                                        if (!res.ok) {
                                            const err = await res.json();
                                            throw new Error(err.message || 'İçe aktarma başarısız');
                                        }

                                        const result = await res.json();
                                        setImportResult(result);

                                        toast({
                                            title: 'Başarılı',
                                            description: `${result.success} yeni raf oluşturuldu, ${result.updated} raf güncellendi`,
                                            variant: 'success',
                                        });

                                        // Refresh shelves for the warehouse
                                        await refreshWarehouseShelves(excelImportWarehouseId);
                                        setExpandedWarehouses(prev => {
                                            const next = new Set(prev);
                                            next.add(excelImportWarehouseId);
                                            return next;
                                        });
                                    } catch (err: any) {
                                        toast({
                                            variant: 'destructive',
                                            title: 'Hata',
                                            description: err.message || 'İçe aktarma başarısız',
                                        });
                                    } finally {
                                        setExcelImporting(false);
                                    }
                                }}
                            >
                                {excelImporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        İçe Aktarılıyor...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        İçe Aktar
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
