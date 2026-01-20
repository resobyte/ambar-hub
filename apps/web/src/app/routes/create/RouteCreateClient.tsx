'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getFilteredOrders,
    createRoute,
    printRouteLabel,
    getStores,
    Store,
} from '@/lib/api';

// ShadCN Components
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2, ArrowLeft, Plus, Check, X, ChevronDown, ChevronRight, Globe, Filter, Package } from 'lucide-react';

interface FilteredOrder {
    id: string;
    orderNumber: string;
    packageId: string;
    status: string;
    totalPrice: number;
    orderDate: string;
    agreedDeliveryDate: string | null;
    micro: boolean;
    store: { id: string; name: string } | null;
    customer: { firstName: string; lastName: string } | null;
    items: {
        barcode: string;
        productName: string;
        quantity: number;
        sku: string;
        productColor?: string;
        productSize?: string;
    }[];
    uniqueProductCount: number;
    totalQuantity: number;
}

export function RouteCreateClient() {
    const router = useRouter();
    const [orders, setOrders] = useState<FilteredOrder[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [storeFilter, setStoreFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [minQuantityFilter, setMinQuantityFilter] = useState<string>('');
    const [maxQuantityFilter, setMaxQuantityFilter] = useState<string>('');
    const [microFilter, setMicroFilter] = useState<string>('');
    const [brandFilter, setBrandFilter] = useState<string>('');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Expanded orders (to show items)
    const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

    // Selection
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [fifoLimit, setFifoLimit] = useState<number>(50);

    // Route form
    const [routeDescription, setRouteDescription] = useState('');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getFilteredOrders({
                storeId: storeFilter && storeFilter !== 'all' ? storeFilter : undefined,
                type: typeFilter && typeFilter !== 'all' ? typeFilter : undefined,
                search: searchFilter || undefined,
                minTotalQuantity: minQuantityFilter ? parseInt(minQuantityFilter) : undefined,
                maxTotalQuantity: maxQuantityFilter ? parseInt(maxQuantityFilter) : undefined,
                micro: microFilter === 'yes' ? true : microFilter === 'no' ? false : undefined,
                brand: brandFilter || undefined,
            });
            setOrders(response.data || []);
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    }, [storeFilter, typeFilter, searchFilter, minQuantityFilter, maxQuantityFilter, microFilter, brandFilter]);

    const fetchStores = useCallback(async () => {
        try {
            const response = await getStores(1, 100);
            setStores(response.data || []);
        } catch (err) {
            console.error('Failed to fetch stores:', err);
        }
    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => { fetchStores(); }, [fetchStores]);

    const toggleOrderExpanded = (orderId: string) => {
        const newSet = new Set(expandedOrderIds);
        if (newSet.has(orderId)) {
            newSet.delete(orderId);
        } else {
            newSet.add(orderId);
        }
        setExpandedOrderIds(newSet);
    };

    const handleSelectAll = () => {
        const limitedOrders = orders.slice(0, fifoLimit);
        setSelectedOrderIds(new Set(limitedOrders.map(o => o.id)));
    };

    const handleClearSelection = () => {
        setSelectedOrderIds(new Set());
    };

    const handleToggleOrder = (orderId: string) => {
        const newSet = new Set(selectedOrderIds);
        if (newSet.has(orderId)) {
            newSet.delete(orderId);
        } else {
            newSet.add(orderId);
        }
        setSelectedOrderIds(newSet);
    };

    const handleSelectFirst = (count: number) => {
        const limitedOrders = orders.slice(0, count);
        setSelectedOrderIds(new Set(limitedOrders.map(o => o.id)));
    };

    const handleCreateRoute = async () => {
        if (selectedOrderIds.size === 0) {
            setError('Lütfen en az bir sipariş seçin');
            return;
        }

        setCreating(true);
        setError(null);

        try {
            const response = await createRoute({
                description: routeDescription.trim() || undefined,
                orderIds: Array.from(selectedOrderIds),
            });

            if (response.data?.id) {
                try {
                    const labelHtml = await printRouteLabel(response.data.id);
                    const blob = new Blob([labelHtml], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                } catch (labelErr) {
                    console.error('Failed to print label:', labelErr);
                }
                router.push('/routes');
            }
        } catch (err: any) {
            setError(err.message || 'Rota oluşturulurken hata oluştu');
        } finally {
            setCreating(false);
        }
    };

    const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
    const totalSelectedQuantity = selectedOrders.reduce((sum, o) => sum + o.totalQuantity, 0);

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/dashboard">Ana Sayfa</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/routes">Rotalar</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Yeni Rota Oluştur</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Selection - Left */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filters */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Sipariş Filtreleri
                                </CardTitle>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                >
                                    {showAdvancedFilters ? 'Gizle' : 'Gelişmiş Filtreler'}
                                    {showAdvancedFilters ? <ChevronDown className="h-4 w-4 ml-1" /> : <ChevronRight className="h-4 w-4 ml-1" />}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex-1 min-w-[200px]">
                                    <Input
                                        placeholder="Sipariş no veya paket ID ara..."
                                        value={searchFilter}
                                        onChange={(e) => setSearchFilter(e.target.value)}
                                    />
                                </div>
                                <Select value={storeFilter} onValueChange={setStoreFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Tüm Mağazalar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tüm Mağazalar</SelectItem>
                                        {stores.map(store => (
                                            <SelectItem key={store.id} value={store.id}>
                                                {store.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Tüm Tipler" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tüm Tipler</SelectItem>
                                        <SelectItem value="single_product">Tekli</SelectItem>
                                        <SelectItem value="single_product_multi">Tek Ürün Çoklu</SelectItem>
                                        <SelectItem value="mixed">Çoklu Ürün</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {showAdvancedFilters && (
                                <div className="pt-4 border-t space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Min Adet</Label>
                                            <Input
                                                type="number"
                                                placeholder="Min"
                                                value={minQuantityFilter}
                                                onChange={(e) => setMinQuantityFilter(e.target.value)}
                                                min={1}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Max Adet</Label>
                                            <Input
                                                type="number"
                                                placeholder="Max"
                                                value={maxQuantityFilter}
                                                onChange={(e) => setMaxQuantityFilter(e.target.value)}
                                                min={1}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Marka/Ürün</Label>
                                            <Input
                                                placeholder="Marka ara..."
                                                value={brandFilter}
                                                onChange={(e) => setBrandFilter(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs text-muted-foreground">Mikro İhracat</Label>
                                            <Select value={microFilter} onValueChange={setMicroFilter}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tümü" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">Tümü</SelectItem>
                                                    <SelectItem value="yes">Mikro İhracat</SelectItem>
                                                    <SelectItem value="no">Normal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setMinQuantityFilter('');
                                                setMaxQuantityFilter('');
                                                setBrandFilter('');
                                                setMicroFilter('');
                                            }}
                                        >
                                            <X className="h-3 w-3 mr-1" />
                                            Filtreleri Temizle
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* FIFO Selection */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">FIFO Seçimi</CardTitle>
                            <CardDescription>
                                İlk N siparişi otomatik seç (en eski siparişler önce)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <Slider
                                        value={[fifoLimit]}
                                        onValueChange={([value]) => setFifoLimit(value)}
                                        max={Math.max(orders.length, 100)}
                                        min={1}
                                        step={1}
                                    />
                                </div>
                                <Input
                                    type="number"
                                    value={fifoLimit}
                                    onChange={(e) => setFifoLimit(parseInt(e.target.value) || 1)}
                                    className="w-20"
                                    min={1}
                                />
                                <Button variant="outline" onClick={() => handleSelectFirst(fifoLimit)}>
                                    İlk {fifoLimit} Siparişi Seç
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Orders Table */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Siparişler ({orders.length} toplam)
                                </CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                        <Check className="h-4 w-4 mr-1" />
                                        Tümünü Seç
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleClearSelection}>
                                        <X className="h-4 w-4 mr-1" />
                                        Seçimi Temizle
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10"></TableHead>
                                            <TableHead className="w-10"></TableHead>
                                            <TableHead>Sipariş No</TableHead>
                                            <TableHead>Mağaza</TableHead>
                                            <TableHead>Müşteri</TableHead>
                                            <TableHead>Ürün</TableHead>
                                            <TableHead>Adet</TableHead>
                                            <TableHead>Tarih</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-8">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : orders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                    Uygun sipariş bulunamadı
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            orders.map((order) => (
                                                <>
                                                    <TableRow
                                                        key={order.id}
                                                        className={`${selectedOrderIds.has(order.id) ? 'bg-primary/5' : ''} ${expandedOrderIds.has(order.id) ? 'border-b-0' : ''}`}
                                                    >
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selectedOrderIds.has(order.id)}
                                                                onCheckedChange={() => handleToggleOrder(order.id)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0"
                                                                onClick={() => toggleOrderExpanded(order.id)}
                                                            >
                                                                {expandedOrderIds.has(order.id) ? (
                                                                    <ChevronDown className="h-4 w-4" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-2">
                                                                {order.orderNumber}
                                                                {order.micro && (
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        <Globe className="h-3 w-3 mr-1" />
                                                                        Mikro
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{order.store?.name || '-'}</TableCell>
                                                        <TableCell>
                                                            {order.customer
                                                                ? `${order.customer.firstName} ${order.customer.lastName}`
                                                                : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {order.uniqueProductCount} ürün
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{order.totalQuantity}</TableCell>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {new Date(order.orderDate).toLocaleDateString('tr-TR')}
                                                        </TableCell>
                                                    </TableRow>
                                                    {expandedOrderIds.has(order.id) && (
                                                        <TableRow key={`${order.id}-items`} className="bg-muted/30">
                                                            <TableCell colSpan={8} className="p-0">
                                                                <div className="px-12 py-3 space-y-2">
                                                                    <div className="text-xs font-medium text-muted-foreground mb-2">
                                                                        Sipariş İçeriği ({order.items.length} kalem)
                                                                    </div>
                                                                    <div className="grid gap-2">
                                                                        {order.items.map((item, idx) => (
                                                                            <div
                                                                                key={`${order.id}-item-${idx}`}
                                                                                className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border"
                                                                            >
                                                                                <div className="flex-1 min-w-0">
                                                                                    <p className="text-sm font-medium truncate">
                                                                                        {item.productName}
                                                                                    </p>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        <span className="text-xs text-muted-foreground">
                                                                                            {item.barcode || item.sku}
                                                                                        </span>
                                                                                        {item.productColor && (
                                                                                            <Badge variant="outline" className="text-xs">
                                                                                                {item.productColor}
                                                                                            </Badge>
                                                                                        )}
                                                                                        {item.productSize && (
                                                                                            <Badge variant="outline" className="text-xs">
                                                                                                {item.productSize}
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="ml-4 flex items-center">
                                                                                    <Badge>
                                                                                        {item.quantity} adet
                                                                                    </Badge>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Route Form - Right */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rota Bilgileri</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {error && (
                                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                                    {error}
                                </div>
                            )}
                            <div className="p-3 bg-muted/50 border rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    Rota otomatik olarak <strong className="text-foreground">R000001</strong> formatında numaralandırılacak
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="routeDesc">Açıklama (Opsiyonel)</Label>
                                <Textarea
                                    id="routeDesc"
                                    value={routeDescription}
                                    onChange={(e) => setRouteDescription(e.target.value)}
                                    placeholder="Opsiyonel açıklama"
                                    rows={3}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Seçim Özeti</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Seçilen Sipariş:</span>
                                <span className="font-semibold">{selectedOrderIds.size}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Toplam Ürün:</span>
                                <span className="font-semibold">{totalSelectedQuantity}</span>
                            </div>
                            {selectedOrders.length > 0 && (
                                <div className="pt-2 border-t">
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Seçilen ilk 5 sipariş:
                                    </p>
                                    <div className="space-y-1">
                                        {selectedOrders.slice(0, 5).map(order => (
                                            <div key={order.id} className="text-xs flex justify-between">
                                                <span>{order.orderNumber}</span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {order.totalQuantity} adet
                                                </Badge>
                                            </div>
                                        ))}
                                        {selectedOrders.length > 5 && (
                                            <p className="text-xs text-muted-foreground">
                                                ...ve {selectedOrders.length - 5} sipariş daha
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleCreateRoute}
                        disabled={creating || selectedOrderIds.size === 0}
                    >
                        {creating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Oluşturuluyor...
                            </>
                        ) : (
                            <>
                                <Plus className="h-4 w-4 mr-2" />
                                Rota Oluştur ({selectedOrderIds.size} sipariş)
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
