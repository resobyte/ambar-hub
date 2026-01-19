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
import { Loader2, ArrowLeft, Plus, Check, X } from 'lucide-react';

interface FilteredOrder {
    id: string;
    orderNumber: string;
    packageId: string;
    status: string;
    totalPrice: number;
    orderDate: string;
    agreedDeliveryDate: string | null;
    store: { id: string; name: string } | null;
    customer: { firstName: string; lastName: string } | null;
    items: {
        barcode: string;
        productName: string;
        quantity: number;
        sku: string;
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

    // Selection
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [fifoLimit, setFifoLimit] = useState<number>(50);

    // Route form
    const [routeName, setRouteName] = useState('');
    const [routeDescription, setRouteDescription] = useState('');

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getFilteredOrders({
                storeId: storeFilter && storeFilter !== 'all' ? storeFilter : undefined,
                type: typeFilter && typeFilter !== 'all' ? typeFilter : undefined,
                search: searchFilter || undefined,
            });
            setOrders(response.data || []);
        } catch (err) {
            console.error('Failed to fetch orders:', err);
        } finally {
            setLoading(false);
        }
    }, [storeFilter, typeFilter, searchFilter]);

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
        if (!routeName.trim()) {
            setError('Lütfen rota adı girin');
            return;
        }
        if (selectedOrderIds.size === 0) {
            setError('Lütfen en az bir sipariş seçin');
            return;
        }

        setCreating(true);
        setError(null);

        try {
            const response = await createRoute({
                name: routeName.trim(),
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

            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push('/routes')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Geri
                </Button>
                <h1 className="text-2xl font-bold">Yeni Rota Oluştur</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Order Selection - Left */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Filters */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Sipariş Filtreleri</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                                <CardTitle className="text-base">
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
                            <div className="max-h-[400px] overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
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
                                                <TableCell colSpan={7} className="text-center py-8">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : orders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    Uygun sipariş bulunamadı
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            orders.map((order) => (
                                                <TableRow
                                                    key={order.id}
                                                    className={selectedOrderIds.has(order.id) ? 'bg-primary/5' : ''}
                                                >
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedOrderIds.has(order.id)}
                                                            onCheckedChange={() => handleToggleOrder(order.id)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {order.orderNumber}
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
                            <div className="space-y-2">
                                <Label htmlFor="routeName">Rota Adı *</Label>
                                <Input
                                    id="routeName"
                                    value={routeName}
                                    onChange={(e) => setRouteName(e.target.value)}
                                    placeholder="Örn: Tekli Siparişler - 20 Ocak"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="routeDesc">Açıklama</Label>
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
                        disabled={creating || selectedOrderIds.size === 0 || !routeName.trim()}
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
