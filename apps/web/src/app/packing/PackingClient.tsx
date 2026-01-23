'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getRoutes,
    startPackingSession,
    getPackingSession,
    scanPackingBarcode,
    completePackingOrder,
    cancelPackingSession,
    getConsumables,
    Route,
    RouteStatus,
    PackingSession,
    Consumable,
    OrderConsumableInput,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    Loader2,
    ArrowLeft,
    Package,
    CheckCircle2,
    AlertCircle,
    ScanBarcode,
    XCircle,
    LogOut,
    Plus,
    Trash2,
    Box,
} from 'lucide-react';

export function PackingClient() {
    const router = useRouter();
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const [routes, setRoutes] = useState<Route[]>([]);
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState<PackingSession | null>(null);
    const [barcode, setBarcode] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Consumables
    const [consumables, setConsumables] = useState<Consumable[]>([]);
    const [isConsumablesModalOpen, setIsConsumablesModalOpen] = useState(false);
    const [orderConsumables, setOrderConsumables] = useState<OrderConsumableInput[]>([]);

    const addLog = (msg: string) => {
        const now = new Date().toLocaleTimeString('tr-TR');
        setLogs(prev => [`${now} ${msg}`, ...prev].slice(0, 20));
    };

    const fetchRoutes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRoutes([RouteStatus.READY]);
            setRoutes(response.data || []);
        } catch (err) {
            console.error('Failed to fetch routes:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchConsumables = useCallback(async () => {
        try {
            const response = await getConsumables();
            if (response.success) {
                // Only show parent consumables
                setConsumables(response.data?.filter(c => !c.parentId) || []);
            }
        } catch (err) {
            console.error('Failed to fetch consumables:', err);
        }
    }, []);

    useEffect(() => { fetchRoutes(); }, [fetchRoutes]);
    useEffect(() => { fetchConsumables(); }, [fetchConsumables]);
    useEffect(() => {
        if (session && barcodeInputRef.current) barcodeInputRef.current.focus();
    }, [session]);

    const handleStartSession = async (routeId: string) => {
        setProcessing(true);
        try {
            const response = await startPackingSession(routeId);
            setSession(response.data);
            addLog(`${response.data.route?.name || 'Rota'} seçildi.`);
            setMessage({ type: 'success', text: 'Paketleme oturumu başlatıldı' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Oturum başlatılamadı' });
        } finally {
            setProcessing(false);
        }
    };

    const handleScanBarcode = async () => {
        if (!barcode.trim() || !session) return;
        setProcessing(true);
        try {
            const result = await scanPackingBarcode(session.id, barcode.trim());
            if (result.success) {
                setMessage({ type: 'success', text: result.message });
                addLog(result.message);
                const updated = await getPackingSession(session.id);
                setSession(updated.data);
            } else {
                setMessage({ type: 'error', text: result.message });
                addLog(`HATA: ${result.message}`);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Barkod okutulamadı' });
            addLog(`HATA: ${err.message}`);
        } finally {
            setBarcode('');
            setProcessing(false);
            barcodeInputRef.current?.focus();
        }
    };

    const handleOpenConsumablesModal = () => {
        // Reset and open modal
        setOrderConsumables([{ consumableId: '', quantity: 1 }]);
        setIsConsumablesModalOpen(true);
    };

    const handleCompleteWithConsumables = async () => {
        if (!session || !session.currentOrderId) return;
        setProcessing(true);
        try {
            const validConsumables = orderConsumables.filter(c => c.consumableId && c.quantity > 0);
            const result = await completePackingOrder(
                session.id, 
                session.currentOrderId,
                validConsumables.length > 0 ? validConsumables : undefined
            );
            setMessage({ type: 'success', text: result.message });
            addLog(result.message);
            setIsConsumablesModalOpen(false);
            setOrderConsumables([]);

            if (result.data.sessionComplete) {
                addLog('Tüm siparişler paketlendi!');
                setSession(null);
                fetchRoutes();
                fetchConsumables();
            } else {
                const updated = await getPackingSession(session.id);
                setSession(updated.data);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Sipariş tamamlanamadı' });
        } finally {
            setProcessing(false);
        }
    };

    const handleCompleteOrder = async () => {
        // Open consumables modal first
        handleOpenConsumablesModal();
    };

    const handleCancelSession = async () => {
        if (!session || !confirm('Oturumu iptal etmek istediğinize emin misiniz?')) return;
        try {
            await cancelPackingSession(session.id);
            setSession(null);
            addLog('Oturum iptal edildi');
            setMessage({ type: 'info', text: 'Oturum iptal edildi' });
        } catch (err) {
            console.error('Cancel failed:', err);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleScanBarcode();
    };

    // Packing session active
    if (session) {
        const currentItems = session.items?.filter(i => i.orderId === session.currentOrderId) || [];
        const scannedCount = currentItems.filter(i => i.isComplete).length;
        const totalCount = currentItems.length;
        const progressPercent = totalCount > 0 ? Math.round((scannedCount / totalCount) * 100) : 0;

        // Get current order info
        const currentOrder = session.items?.find(i => i.orderId === session.currentOrderId)?.order;

        // Route orders logic
        const ordersMap = new Map<string, {
            id: string;
            number: string;
            customer: string;
            totalItems: number;
            packedItems: number;
            isComplete: boolean;
        }>();

        session.items?.forEach(item => {
            if (!ordersMap.has(item.orderId)) {
                ordersMap.set(item.orderId, {
                    id: item.orderId,
                    number: item.order?.orderNumber || 'Bilinmiyor',
                    customer: item.order?.customer ? `${item.order.customer.firstName || ''} ${item.order.customer.lastName || ''}`.trim() : '-',
                    totalItems: 0,
                    packedItems: 0,
                    isComplete: true
                });
            }
            const order = ordersMap.get(item.orderId)!;
            order.totalItems += 1;
            if (item.isComplete) order.packedItems++;
            if (!item.isComplete) order.isComplete = false;
        });

        const routeOrders = Array.from(ordersMap.values());

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
                                    <Link href="/packing">Paketleme</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>{session.route?.name}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleCancelSession}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Oturumu Kapat
                    </Button>
                </div>

                {/* Main Content */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
                    {/* Left Sidebar - Log */}
                    <Card className="hidden lg:flex flex-col min-h-0">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">İşlem Logu</CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1 px-4 pb-4">
                            <div className="space-y-1 text-xs">
                                {logs.map((log, i) => (
                                    <p key={i} className="text-muted-foreground">{log}</p>
                                ))}
                            </div>
                        </ScrollArea>
                    </Card>

                    {/* Center - Main Packing Area */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {/* Progress Card */}
                        <Card className="bg-gradient-to-r from-teal-600 to-teal-700 text-white border-0">
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <p className="text-teal-100 text-sm">
                                            Sipariş {session.packedOrders + 1}/{session.totalOrders}
                                        </p>
                                        {currentOrder && (
                                            <p className="font-semibold">
                                                {currentOrder.orderNumber}
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-4xl font-bold">{scannedCount}/{totalCount}</p>
                                        <p className="text-teal-100 text-xs">ürün okutuldu</p>
                                    </div>
                                </div>
                                <Progress value={progressPercent} className="h-2 bg-white/20" />
                            </CardContent>
                        </Card>

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
                                        ref={barcodeInputRef}
                                        type="text"
                                        value={barcode}
                                        onChange={(e) => setBarcode(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        className="flex-1 text-lg"
                                        placeholder="Ürün barkodu okutun..."
                                        autoFocus
                                        disabled={processing}
                                    />
                                    <Button
                                        onClick={handleScanBarcode}
                                        disabled={!barcode.trim() || processing}
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

                        {/* Current Order Items */}
                        <Card className="flex-1 flex flex-col min-h-0">
                            <CardHeader className="py-3 border-b">
                                <CardTitle className="text-sm flex items-center justify-between">
                                    <span>Sipariş Ürünleri</span>
                                    {currentOrder?.customer && (
                                        <Badge variant="outline">
                                            {currentOrder.customer.firstName} {currentOrder.customer.lastName}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <ScrollArea className="flex-1">
                                <div className="divide-y">
                                    {currentItems.map((item, idx) => (
                                        <div
                                            key={item.id}
                                            className={`p-4 flex items-center justify-between ${item.isComplete ? 'bg-green-50' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${item.isComplete ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                                    {item.isComplete ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-mono text-sm">{item.barcode}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Adet: {item.requiredQuantity}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant={item.isComplete ? 'default' : 'secondary'}>
                                                {item.scannedQuantity}/{item.requiredQuantity}
                                            </Badge>
                                        </div>
                                    ))}
                                    {currentItems.length === 0 && (
                                        <div className="p-8 text-center text-muted-foreground">
                                            Sipariş yükleniyor...
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </Card>

                        {/* Complete Button */}
                        {scannedCount === totalCount && totalCount > 0 && (
                            <Button
                                size="lg"
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={handleCompleteOrder}
                                disabled={processing}
                            >
                                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Siparişi Tamamla
                            </Button>
                        )}
                    </div>

                    {/* Right Sidebar - Route Orders */}
                    <Card className="flex flex-col min-h-0">
                        <CardHeader className="py-3 border-b">
                            <CardTitle className="text-sm">Rotadaki Siparişler</CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-xs">Sipariş</TableHead>
                                        <TableHead className="text-xs text-right">Durum</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {routeOrders.map(order => (
                                        <TableRow
                                            key={order.id}
                                            className={order.isComplete ? 'bg-green-50/50' : order.id === session.currentOrderId ? 'bg-blue-50' : ''}
                                        >
                                            <TableCell className="py-2">
                                                <p className="font-medium text-xs">{order.number}</p>
                                                <p className="text-xs text-muted-foreground">{order.customer}</p>
                                            </TableCell>
                                            <TableCell className="py-2 text-right">
                                                {order.isComplete ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                                                ) : (
                                                    <Badge variant="outline" className="text-xs">
                                                        {order.packedItems}/{order.totalItems}
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </Card>
                </div>

                {/* Consumables Modal */}
                <Dialog open={isConsumablesModalOpen} onOpenChange={setIsConsumablesModalOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Box className="h-5 w-5 text-orange-600" />
                                Sarf Malzeme Girişi
                            </DialogTitle>
                            <DialogDescription>
                                Sipariş {currentOrder?.orderNumber} için kullanılan sarf malzemeleri girin
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex justify-between items-center">
                                <Label>Kullanılan Malzemeler</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setOrderConsumables([...orderConsumables, { consumableId: '', quantity: 1 }])}
                                >
                                    <Plus className="h-3 w-3 mr-1" /> Ekle
                                </Button>
                            </div>
                            {orderConsumables.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Sarf malzeme eklenmedi. İsterseniz ekleyebilir veya devam edebilirsiniz.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {orderConsumables.map((item, index) => {
                                        const consumable = consumables.find(c => c.id === item.consumableId);
                                        return (
                                            <div key={index} className="flex items-center gap-2">
                                                <Select
                                                    value={item.consumableId}
                                                    onValueChange={(v) => {
                                                        const updated = [...orderConsumables];
                                                        updated[index].consumableId = v;
                                                        setOrderConsumables(updated);
                                                    }}
                                                >
                                                    <SelectTrigger className="flex-1 h-9">
                                                        <SelectValue placeholder="Malzeme seç" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {consumables.map(c => (
                                                            <SelectItem key={c.id} value={c.id}>
                                                                {c.name} (Stok: {c.stockQuantity})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="number"
                                                    className="w-20 h-9"
                                                    min={0.01}
                                                    step={0.01}
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const updated = [...orderConsumables];
                                                        updated[index].quantity = parseFloat(e.target.value) || 0;
                                                        setOrderConsumables(updated);
                                                    }}
                                                />
                                                {consumable && (
                                                    <span className="text-xs text-muted-foreground w-12">
                                                        {consumable.unit === 'METER' ? 'm' : consumable.unit === 'KILOGRAM' ? 'kg' : 'adet'}
                                                    </span>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        setOrderConsumables(orderConsumables.filter((_, i) => i !== index));
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsConsumablesModalOpen(false)}>
                                İptal
                            </Button>
                            <Button 
                                onClick={handleCompleteWithConsumables}
                                disabled={processing}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Tamamla
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                            <BreadcrumbPage>Paketleme</BreadcrumbPage>
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
                                {routes.length === 0 ? 'Paketlenecek rota bulunmuyor' : 'Aramayla eşleşen rota yok'}
                            </p>
                            {routes.length === 0 && (
                                <>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Önce toplama işlemini tamamlayın
                                    </p>
                                    <Button className="mt-4" onClick={() => router.push('/picking')}>
                                        Toplamaya Git
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rota</TableHead>
                                    <TableHead className="text-center w-24">Sipariş</TableHead>
                                    <TableHead className="text-center w-32">Paketlenen</TableHead>
                                    <TableHead className="w-28"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRoutes.map((route) => (
                                    <TableRow
                                        key={route.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleStartSession(route.id)}
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
                                        <TableCell className="text-center">
                                            <span className="text-sm">
                                                {route.packedOrderCount || 0}/{route.totalOrderCount}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Button size="sm" variant="ghost">
                                                <Package className="w-4 h-4 mr-1" />
                                                Paketle
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
