'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    getRoutes,
    getPickingProgress,
    scanPickingBarcode,
    Route,
    RouteStatus,
    PickingProgress,
    PickingItem,
} from '@/lib/api';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Loader2,
    ArrowLeft,
    Package,
    MapPin,
    CheckCircle2,
    AlertCircle,
    ScanBarcode,
} from 'lucide-react';

export function PickingClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState<PickingProgress | null>(null);
    const [barcode, setBarcode] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [lastScannedItem, setLastScannedItem] = useState<PickingItem | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    const selectedRouteId = searchParams.get('route');

    const fetchRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRoutes([RouteStatus.COLLECTING]);
            setRoutes(response.data || []);
        } catch (err) {
            console.error('Failed to fetch routes:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadProgress = useCallback(async (routeId: string) => {
        try {
            const response = await getPickingProgress(routeId);
            setProgress(response.data);
        } catch (err) {
            console.error('Failed to load progress:', err);
        }
    }, []);

    useEffect(() => { fetchRoutes(); }, [fetchRoutes]);
    useEffect(() => {
        if (selectedRouteId) loadProgress(selectedRouteId);
    }, [selectedRouteId, loadProgress]);
    useEffect(() => {
        if (progress && barcodeInputRef.current) barcodeInputRef.current.focus();
    }, [progress]);

    const handleSelectRoute = (routeId: string) => {
        router.push(`/picking?route=${routeId}`);
    };

    const handleScanBarcode = async () => {
        if (!barcode.trim() || !selectedRouteId) return;
        setProcessing(true);
        try {
            const result = await scanPickingBarcode(selectedRouteId, barcode.trim(), quantity);
            if (result.success) {
                setMessage({ type: 'success', text: result.message });
                setLastScannedItem(result.data.item || null);
                if (result.data.progress) {
                    setProgress(result.data.progress);
                    if (result.data.progress.isComplete) {
                        setMessage({ type: 'info', text: 'Tüm ürünler toplandı! Rota hazır.' });
                        fetchRoutes();
                    }
                }
                setQuantity(1);
            } else {
                setMessage({ type: 'error', text: result.message });
                setLastScannedItem(null);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Barkod okutulamadı' });
            setLastScannedItem(null);
        } finally {
            setBarcode('');
            setProcessing(false);
            barcodeInputRef.current?.focus();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleScanBarcode();
    };

    // Picking interface
    if (progress && selectedRouteId) {
        const completedItems = progress.items.filter(i => i.isComplete);
        const pendingItems = progress.items.filter(i => !i.isComplete);
        const progressPercent = progress.totalItems > 0
            ? Math.round((progress.pickedItems / progress.totalItems) * 100)
            : 0;

        return (
            <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
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
                                    <Link href="/picking">Toplama</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{progress.routeName}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <Button
                        variant="outline"
                        onClick={() => { router.push('/picking'); setProgress(null); }}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Geri
                    </Button>
                </div>

                {/* Progress Card */}
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    {progress.totalOrders} sipariş • {progress.pickedItems}/{progress.totalItems} ürün
                                </p>
                            </div>
                            <Badge variant="secondary" className="text-lg px-3">
                                %{progressPercent}
                            </Badge>
                        </div>
                        <Progress value={progressPercent} className="h-3" />
                    </CardContent>
                </Card>

                {/* Main Content */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
                    {/* Left Panel */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {/* Message */}
                        {message && (
                            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                                {message.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                                {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
                                {message.type === 'info' && <Package className="h-4 w-4" />}
                                <AlertDescription>{message.text}</AlertDescription>
                            </Alert>
                        )}

                        {/* Barcode Input */}
                        <Card>
                            <CardContent className="py-4">
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-20 text-center text-lg"
                                        disabled={processing || progress.isComplete}
                                    />
                                    <Input
                                        ref={barcodeInputRef}
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        className="flex-1 text-lg"
                                        placeholder="Barkodu okutun..."
                                        autoFocus
                                        disabled={processing || progress.isComplete}
                                    />
                                    <Button
                                        onClick={handleScanBarcode}
                                        disabled={!barcode.trim() || processing || progress.isComplete}
                                        size="lg"
                                    >
                                        {processing ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <ScanBarcode className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Next Shelf Guidance */}
                        {pendingItems.length > 0 && pendingItems[0].shelfLocation && (
                            <Card className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                                <CardContent className="py-4">
                                    <p className="text-sm font-medium text-white/90 uppercase tracking-wider mb-1">
                                        SIRADAKİ RAF
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-8 h-8" />
                                        <span className="text-3xl font-bold">{pendingItems[0].shelfLocation}</span>
                                    </div>
                                    <p className="mt-2 text-white/90 text-sm">
                                        Bu raftan <strong>{pendingItems[0].productName}</strong> alacaksınız.
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Last Scanned Item */}
                        {lastScannedItem && (
                            <Card className="border-green-300 bg-green-50/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Son Okutulan
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Barkod</p>
                                            <p className="font-mono font-bold">{lastScannedItem.barcode}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Ürün</p>
                                            <p className="font-medium">{lastScannedItem.productName}</p>
                                            {lastScannedItem.shelfLocation && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {lastScannedItem.shelfLocation}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Adet</p>
                                            <p className="text-xl font-bold text-primary">
                                                {lastScannedItem.pickedQuantity} / {lastScannedItem.totalQuantity}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Pending Items */}
                        <Card className="flex-1 flex flex-col min-h-0">
                            <CardHeader className="py-3 bg-amber-50 border-b">
                                <CardTitle className="text-sm text-amber-800 flex items-center justify-between">
                                    <span>Bekleyen ({pendingItems.length})</span>
                                    <Badge variant="outline" className="text-amber-600">Sıralı Liste</Badge>
                                </CardTitle>
                            </CardHeader>
                            <ScrollArea className="flex-1">
                                <div className="divide-y">
                                    {pendingItems.map((item, idx) => (
                                        <div
                                            key={item.barcode}
                                            className={`p-4 ${idx === 0 ? 'bg-amber-50/50' : ''}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{item.productName}</p>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <code className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                            {item.barcode}
                                                        </code>
                                                        {item.shelfLocation && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                <MapPin className="w-3 h-3 mr-1" />
                                                                {item.shelfLocation}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-lg px-3 py-1">
                                                    {item.pickedQuantity}/{item.totalQuantity}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </Card>
                    </div>

                    {/* Right Panel - Completed Items */}
                    <Card className="flex flex-col min-h-0">
                        <CardHeader className="py-3 bg-green-50 border-b">
                            <CardTitle className="text-sm text-green-800">
                                Tamamlanan ({completedItems.length})
                            </CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1">
                            <div className="divide-y">
                                {completedItems.map((item) => (
                                    <div key={item.barcode} className="p-3 bg-green-50/30 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-sm">{item.productName}</p>
                                            <p className="text-xs font-mono text-muted-foreground">{item.barcode}</p>
                                        </div>
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    </div>
                                ))}
                                {completedItems.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground text-sm">
                                        Henüz tamamlanan ürün yok
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </Card>
                </div>

                {/* Completed State */}
                {progress.isComplete && (
                    <Card className="bg-green-50 border-green-200">
                        <CardContent className="py-6 text-center">
                            <div className="text-4xl mb-2">🎉</div>
                            <h3 className="text-lg font-semibold text-green-800">Toplama Tamamlandı!</h3>
                            <Button
                                className="mt-4 bg-green-600 hover:bg-green-700"
                                onClick={() => router.push('/packing')}
                            >
                                Paketlemeye Git
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    const filteredRoutes = routes.filter(route =>
        route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (route.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Route selection
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/dashboard">Ana Sayfa</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>Toplama</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <Button variant="outline" size="sm" onClick={() => router.push('/routes')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Rotalar
                </Button>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
                <Input
                    placeholder="Rota ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-xs"
                />
                <Badge variant="secondary">{filteredRoutes.length} rota</Badge>
            </div>

            {/* Route Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filteredRoutes.length === 0 ? (
                        <div className="py-12 text-center">
                            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                            <p className="text-muted-foreground">
                                {routes.length === 0 ? 'Toplanacak rota bulunmuyor' : 'Aramayla eşleşen rota yok'}
                            </p>
                            {routes.length === 0 && (
                                <Button className="mt-4" onClick={() => router.push('/routes')}>
                                    Rota Oluştur
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rota</TableHead>
                                    <TableHead className="text-center w-24">Sipariş</TableHead>
                                    <TableHead className="w-48">İlerleme</TableHead>
                                    <TableHead className="w-24"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRoutes.map((route) => {
                                    const progressPercent = route.totalItemCount > 0
                                        ? Math.round(((route.pickedItemCount || 0) / route.totalItemCount) * 100)
                                        : 0;
                                    return (
                                        <TableRow
                                            key={route.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => handleSelectRoute(route.id)}
                                        >
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{route.name}</p>
                                                    {route.description && (
                                                        <p className="text-xs text-muted-foreground">{route.description}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline">{route.totalOrderCount}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Progress value={progressPercent} className="h-2 flex-1" />
                                                    <span className="text-xs text-muted-foreground w-16">
                                                        {route.pickedItemCount || 0}/{route.totalItemCount}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm" variant="ghost">
                                                    <Package className="w-4 h-4 mr-1" />
                                                    Topla
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
