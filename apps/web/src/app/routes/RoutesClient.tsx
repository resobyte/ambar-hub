'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getRoutes,
    getRouteSuggestions,
    createRoute,
    deleteRoute,
    printRouteLabel,
    Route,
    RouteSuggestion,
    RouteStatus,
    getStores,
    Store
} from '@/lib/api';

// ShadCN Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Loader2, Plus, Printer, Trash2, Eye, Package, Route as RouteIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export function RoutesClient() {
    const router = useRouter();
    const [routes, setRoutes] = useState<Route[]>([]);
    const [suggestions, setSuggestions] = useState<RouteSuggestion[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);

    // Routes filters
    const [routeStatusFilter, setRouteStatusFilter] = useState<string>('active');
    const [routeSearchFilter, setRouteSearchFilter] = useState<string>('');

    // Suggestions filters
    const [storeFilter, setStoreFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');

    // Pagination
    const [routesPage, setRoutesPage] = useState(1);
    const routesPerPage = 10;

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<RouteSuggestion | null>(null);
    const [routeName, setRouteName] = useState('');
    const [routeDescription, setRouteDescription] = useState('');
    const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
    const [fifoLimit, setFifoLimit] = useState<number>(50);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Compute status filter for API
    const getStatusFilter = useCallback((): RouteStatus[] | undefined => {
        switch (routeStatusFilter) {
            case 'active':
                return [RouteStatus.COLLECTING, RouteStatus.READY];
            case 'collecting':
                return [RouteStatus.COLLECTING];
            case 'ready':
                return [RouteStatus.READY];
            case 'completed':
                return [RouteStatus.COMPLETED];
            case 'cancelled':
                return [RouteStatus.CANCELLED];
            default:
                return undefined;
        }
    }, [routeStatusFilter]);

    const fetchRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRoutes(getStatusFilter());
            setRoutes(response.data || []);
        } catch (err) {
            console.error('Failed to fetch routes:', err);
        } finally {
            setLoading(false);
        }
    }, [getStatusFilter]);

    const fetchSuggestions = useCallback(async () => {
        setLoadingSuggestions(true);
        try {
            const response = await getRouteSuggestions({
                storeId: storeFilter || undefined,
                type: typeFilter || undefined,
            });
            setSuggestions(response.data || []);
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
        } finally {
            setLoadingSuggestions(false);
        }
    }, [storeFilter, typeFilter]);

    const fetchStores = useCallback(async () => {
        try {
            const response = await getStores(1, 100);
            setStores(response.data || []);
        } catch (err) {
            console.error('Failed to fetch stores:', err);
        }
    }, []);

    useEffect(() => { fetchRoutes(); }, [fetchRoutes]);
    useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);
    useEffect(() => { fetchStores(); }, [fetchStores]);

    // Filter and paginate routes
    const filteredRoutes = routes.filter(route => {
        if (!routeSearchFilter) return true;
        const search = routeSearchFilter.toLowerCase();
        return route.name.toLowerCase().includes(search) ||
            (route.description && route.description.toLowerCase().includes(search));
    });

    const totalPages = Math.ceil(filteredRoutes.length / routesPerPage);
    const paginatedRoutes = filteredRoutes.slice(
        (routesPage - 1) * routesPerPage,
        routesPage * routesPerPage
    );

    const handleSelectSuggestion = (suggestion: RouteSuggestion) => {
        setSelectedSuggestion(suggestion);
        setRouteName(suggestion.name);
        setRouteDescription(suggestion.description);
        // Default to all orders, user can adjust with FIFO limit
        setFifoLimit(Math.min(suggestion.orders.length, 50));
        setSelectedOrderIds(suggestion.orders.map(o => o.id));
        setIsModalOpen(true);
    };

    // Update selected orders when FIFO limit changes
    const handleFifoLimitChange = (newLimit: number) => {
        setFifoLimit(newLimit);
        if (selectedSuggestion) {
            const limitedOrders = selectedSuggestion.orders.slice(0, newLimit);
            setSelectedOrderIds(limitedOrders.map(o => o.id));
        }
    };

    const handleCreateRoute = async () => {
        if (!routeName.trim() || selectedOrderIds.length === 0) {
            setError('Lütfen rota adı girin ve en az bir sipariş seçin');
            return;
        }
        setCreating(true);
        setError(null);
        try {
            const response = await createRoute({
                name: routeName.trim(),
                description: routeDescription.trim() || undefined,
                orderIds: selectedOrderIds,
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
            }
            setIsModalOpen(false);
            setRouteName('');
            setRouteDescription('');
            setSelectedOrderIds([]);
            setSelectedSuggestion(null);
            fetchRoutes();
            fetchSuggestions();
        } catch (err: any) {
            setError(err.message || 'Rota oluşturulurken hata oluştu');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteRoute = async (routeId: string) => {
        if (!confirm('Bu rotayı iptal etmek istediğinize emin misiniz?')) return;
        try {
            await deleteRoute(routeId);
            fetchRoutes();
            fetchSuggestions();
        } catch (err) {
            console.error('Failed to delete route:', err);
        }
    };

    const handlePrintLabel = async (routeId: string) => {
        try {
            const labelHtml = await printRouteLabel(routeId);
            const blob = new Blob([labelHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error('Failed to print label:', err);
        }
    };

    const getStatusBadge = (status: RouteStatus) => {
        const config: Record<RouteStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
            [RouteStatus.COLLECTING]: { variant: 'default', label: 'Toplanıyor' },
            [RouteStatus.READY]: { variant: 'secondary', label: 'Hazır' },
            [RouteStatus.COMPLETED]: { variant: 'outline', label: 'Tamamlandı' },
            [RouteStatus.CANCELLED]: { variant: 'destructive', label: 'İptal' },
        };
        const { variant, label } = config[status];
        return <Badge variant={variant}>{label}</Badge>;
    };

    const getTypeBadge = (type: string) => {
        const labels: Record<string, string> = {
            single_product: 'Tekli Sipariş',
            single_product_multi: 'Aynı Ürün Çoklu',
            mixed: 'Karma Sipariş',
        };
        return <Badge variant="outline">{labels[type] || type}</Badge>;
    };

    const getTypeDescription = (type: string) => {
        const descriptions: Record<string, string> = {
            single_product: 'Tek ürün, tek adet siparişler',
            single_product_multi: 'Aynı üründen birden fazla adet siparişler',
            mixed: 'Birden fazla farklı ürün içeren siparişler',
        };
        return descriptions[type] || '';
    };

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
                        <BreadcrumbPage>Rotalar</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            {/* Tabs */}
            <Tabs defaultValue="routes" className="w-full">
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="routes" className="flex items-center gap-2">
                            <RouteIcon className="h-4 w-4" />
                            Rotalar
                        </TabsTrigger>
                        <TabsTrigger value="suggestions" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Rota Önerileri
                        </TabsTrigger>
                    </TabsList>
                    <Button variant="outline" onClick={() => router.push('/routes/create')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Manuel Rota Oluştur
                    </Button>
                </div>

                {/* Routes Tab */}
                <TabsContent value="routes">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Mevcut Rotalar</CardTitle>
                            {/* Filters Row */}
                            <div className="flex items-center gap-4 pt-4 flex-wrap">
                                <div className="flex-1 min-w-[200px]">
                                    <Input
                                        placeholder="Rota adı ara..."
                                        value={routeSearchFilter}
                                        onChange={(e) => {
                                            setRouteSearchFilter(e.target.value);
                                            setRoutesPage(1);
                                        }}
                                    />
                                </div>
                                <Select value={routeStatusFilter} onValueChange={(v) => {
                                    setRouteStatusFilter(v);
                                    setRoutesPage(1);
                                }}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Durum" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tümü</SelectItem>
                                        <SelectItem value="active">Aktif (Toplanıyor + Hazır)</SelectItem>
                                        <SelectItem value="collecting">Toplanıyor</SelectItem>
                                        <SelectItem value="ready">Hazır</SelectItem>
                                        <SelectItem value="completed">Tamamlandı</SelectItem>
                                        <SelectItem value="cancelled">İptal Edilmiş</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rota Adı</TableHead>
                                        <TableHead>Durum</TableHead>
                                        <TableHead>Sipariş</TableHead>
                                        <TableHead>Oluşturulma</TableHead>
                                        <TableHead className="text-right">İşlemler</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : paginatedRoutes.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                {filteredRoutes.length === 0 ? 'Henüz rota bulunmuyor' : 'Arama sonucu bulunamadı'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedRoutes.map((route) => (
                                            <TableRow key={route.id}>
                                                <TableCell>
                                                    <Link
                                                        href={`/routes/${route.id}`}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {route.name}
                                                    </Link>
                                                    {route.description && (
                                                        <p className="text-sm text-muted-foreground">{route.description}</p>
                                                    )}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(route.status)}</TableCell>
                                                <TableCell>{route.totalOrderCount}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(route.createdAt).toLocaleDateString('tr-TR')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => router.push(`/routes/${route.id}`)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handlePrintLabel(route.id)}
                                                        >
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                        {route.status === RouteStatus.COLLECTING && (
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                onClick={() => router.push(`/picking?route=${route.id}`)}
                                                            >
                                                                Topla
                                                            </Button>
                                                        )}
                                                        {route.status !== RouteStatus.COMPLETED && route.status !== RouteStatus.CANCELLED && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:text-destructive"
                                                                onClick={() => handleDeleteRoute(route.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        {filteredRoutes.length} rotadan {(routesPage - 1) * routesPerPage + 1}-{Math.min(routesPage * routesPerPage, filteredRoutes.length)} arası gösteriliyor
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setRoutesPage(p => p - 1)}
                                            disabled={routesPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm">
                                            {routesPage} / {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setRoutesPage(p => p + 1)}
                                            disabled={routesPage === totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Suggestions Tab */}
                <TabsContent value="suggestions">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>Rota Önerileri</CardTitle>
                            <CardDescription>
                                Bekleyen siparişler analiz edilerek gruplandırılmış öneriler
                            </CardDescription>
                            {/* Filters Row */}
                            <div className="flex items-center gap-4 pt-4 flex-wrap">
                                <Select value={storeFilter} onValueChange={setStoreFilter}>
                                    <SelectTrigger className="w-[200px]">
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
                                    <SelectTrigger className="w-[200px]">
                                        <SelectValue placeholder="Tüm Sipariş Tipleri" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tüm Sipariş Tipleri</SelectItem>
                                        <SelectItem value="single_product">Tekli Sipariş</SelectItem>
                                        <SelectItem value="single_product_multi">Aynı Ürün Çoklu</SelectItem>
                                        <SelectItem value="mixed">Karma Sipariş</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Öneri</TableHead>
                                        <TableHead>Tip</TableHead>
                                        <TableHead>Mağaza</TableHead>
                                        <TableHead>Sipariş Sayısı</TableHead>
                                        <TableHead>Toplam Adet</TableHead>
                                        <TableHead className="text-right">İşlemler</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingSuggestions ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : suggestions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Rota önerisi bulunamadı
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        suggestions.map((suggestion) => (
                                            <TableRow key={suggestion.id}>
                                                <TableCell>
                                                    <div className="font-medium">{suggestion.name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {suggestion.products.length} farklı ürün
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {getTypeBadge(suggestion.type)}
                                                        <span className="text-xs text-muted-foreground">
                                                            {getTypeDescription(suggestion.type)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{suggestion.storeName || '-'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{suggestion.orderCount}</Badge>
                                                </TableCell>
                                                <TableCell>{suggestion.totalQuantity} adet</TableCell>
                                                <TableCell className="text-right">
                                                    <Button onClick={() => handleSelectSuggestion(suggestion)}>
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        Rota Oluştur
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create Route Dialog */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle>Rota Oluştur</DialogTitle>
                        <DialogDescription>
                            Seçilen siparişlerden yeni bir rota oluşturun
                        </DialogDescription>
                    </DialogHeader>
                    {error && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="routeName">Rota Adı</Label>
                            <Input
                                id="routeName"
                                value={routeName}
                                onChange={(e) => setRouteName(e.target.value)}
                                placeholder="Rota adı girin"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="routeDesc">Açıklama (Opsiyonel)</Label>
                            <Textarea
                                id="routeDesc"
                                value={routeDescription}
                                onChange={(e) => setRouteDescription(e.target.value)}
                                placeholder="Açıklama ekleyin"
                                rows={2}
                            />
                        </div>

                        {/* FIFO Limit in Modal */}
                        {selectedSuggestion && selectedSuggestion.orders.length > 1 && (
                            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <Label>Kaç sipariş alınsın?</Label>
                                    <span className="text-sm font-medium">
                                        {fifoLimit} / {selectedSuggestion.orders.length}
                                    </span>
                                </div>
                                <Slider
                                    value={[fifoLimit]}
                                    onValueChange={([value]) => handleFifoLimitChange(value)}
                                    max={selectedSuggestion.orders.length}
                                    min={1}
                                    step={1}
                                />
                                <p className="text-xs text-muted-foreground">
                                    İlk {fifoLimit} sipariş alınacak (FIFO - en eski siparişler önce)
                                </p>
                            </div>
                        )}

                        <div className="p-3 bg-primary/5 border rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Seçilen Sipariş:</span>
                                <span className="font-semibold">{selectedOrderIds.length}</span>
                            </div>
                            {selectedSuggestion && (
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-sm text-muted-foreground">Toplam Ürün:</span>
                                    <span className="font-semibold">
                                        {selectedSuggestion.orders
                                            .slice(0, fifoLimit)
                                            .reduce((sum, o) => sum + o.totalQuantity, 0)} adet
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            İptal
                        </Button>
                        <Button onClick={handleCreateRoute} disabled={creating}>
                            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Rota Oluştur
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
