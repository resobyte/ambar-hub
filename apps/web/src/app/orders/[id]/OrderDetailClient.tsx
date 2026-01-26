'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getOrder,
    getOrderTimeline,
    Order,
    OrderHistoryEvent,
    OrderStatus,
    getOrderStockMovements,
    StockMovement,
    getOrderCargoLabel,
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
    Loader2,
    ArrowLeft,
    Package,
    User,
    MapPin,
    Calendar,
    Truck,
    FileText,
    CheckCircle2,
    Circle,
    XCircle,
    Clock,
    Route,
    PackageCheck,
    Send,
    AlertCircle,
    ArrowDownLeft,
    ArrowUpRight,
    ArrowLeftRight,
    Printer,
} from 'lucide-react';
import { ReshipmentModal } from '@/components/orders/ReshipmentModal';

interface Props {
    orderId: string;
}

const statusColors: Record<string, string> = {
    CREATED: 'bg-gray-100 text-gray-800',
    WAITING_STOCK: 'bg-red-50 text-red-700',
    WAITING_PICKING: 'bg-yellow-100 text-yellow-800',
    PICKING: 'bg-orange-100 text-orange-800',
    PICKED: 'bg-amber-100 text-amber-800',
    PACKING: 'bg-cyan-100 text-cyan-800',
    PACKED: 'bg-indigo-100 text-indigo-800',
    INVOICED: 'bg-purple-100 text-purple-800',
    SHIPPED: 'bg-blue-100 text-blue-800',
    DELIVERED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    RETURNED: 'bg-orange-100 text-orange-800',
    REPACK: 'bg-pink-100 text-pink-800',
    UNSUPPLIED: 'bg-gray-100 text-gray-800',
    UNDELIVERED: 'bg-red-100 text-red-800',
    UNKNOWN: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
    CREATED: 'Oluşturuldu',
    WAITING_STOCK: 'Stok Bekliyor',
    WAITING_PICKING: 'Toplama Bekliyor',
    PICKING: 'Toplanıyor',
    PICKED: 'Rotada Toplanmış',
    PACKING: 'Paketleniyor',
    PACKED: 'Paketlendi',
    INVOICED: 'Faturalandı',
    SHIPPED: 'Kargoya Verildi',
    DELIVERED: 'Teslim Edildi',
    CANCELLED: 'İptal Edildi',
    RETURNED: 'İade Edildi',
    REPACK: 'Yeniden Paketleme',
    UNSUPPLIED: 'Tedarik Edilemedi',
    UNDELIVERED: 'Teslim Edilemedi',
    UNKNOWN: 'Bilinmiyor',
};

const actionIcons: Record<string, React.ReactNode> = {
    CREATED: <Circle className="h-4 w-4" />,
    ROUTE_ASSIGNED: <Route className="h-4 w-4" />,
    PICKING_STARTED: <Package className="h-4 w-4" />,
    PICKING_COMPLETED: <PackageCheck className="h-4 w-4" />,
    PACKING_STARTED: <Package className="h-4 w-4" />,
    PACKING_COMPLETED: <CheckCircle2 className="h-4 w-4" />,
    INVOICE_CREATED: <FileText className="h-4 w-4" />,
    INTEGRATION_STATUS_PICKING: <Send className="h-4 w-4" />,
    INTEGRATION_STATUS_INVOICED: <Send className="h-4 w-4" />,
    WAYBILL_CREATED: <FileText className="h-4 w-4" />,
    CARGO_CREATED: <Truck className="h-4 w-4" />,
    CARGO_LABEL_FETCHED: <FileText className="h-4 w-4" />,
    INVOICED: <FileText className="h-4 w-4" />,
    SHIPPED: <Truck className="h-4 w-4" />,
    DELIVERED: <CheckCircle2 className="h-4 w-4" />,
    CANCELLED: <XCircle className="h-4 w-4" />,
    RETURNED: <AlertCircle className="h-4 w-4" />,
    STATUS_CHANGED: <Circle className="h-4 w-4" />,
    NOTE_ADDED: <FileText className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
    CREATED: 'bg-blue-500',
    ROUTE_ASSIGNED: 'bg-indigo-500',
    PICKING_STARTED: 'bg-yellow-500',
    PICKING_COMPLETED: 'bg-yellow-600',
    PACKING_STARTED: 'bg-orange-500',
    PACKING_COMPLETED: 'bg-green-500',
    INVOICE_CREATED: 'bg-purple-500',
    INTEGRATION_STATUS_PICKING: 'bg-sky-500',
    INTEGRATION_STATUS_INVOICED: 'bg-violet-500',
    WAYBILL_CREATED: 'bg-teal-500',
    CARGO_CREATED: 'bg-blue-600',
    CARGO_LABEL_FETCHED: 'bg-blue-400',
    INVOICED: 'bg-purple-500',
    SHIPPED: 'bg-green-600',
    DELIVERED: 'bg-green-700',
    CANCELLED: 'bg-red-500',
    RETURNED: 'bg-orange-500',
    STATUS_CHANGED: 'bg-gray-500',
    NOTE_ADDED: 'bg-gray-400',
};

const actionLabels: Record<string, string> = {
    CREATED: 'Sipariş Oluşturuldu',
    ROUTE_ASSIGNED: 'Rotaya Eklendi',
    PICKING_STARTED: 'Toplama Başladı',
    PICKING_COMPLETED: 'Toplama Tamamlandı',
    PACKING_STARTED: 'Paketleme Başladı',
    PACKING_COMPLETED: 'Paketleme Tamamlandı',
    INVOICE_CREATED: 'Fatura Kesildi',
    INTEGRATION_STATUS_PICKING: 'Pazar Yerine Statü Gönderildi (Picking)',
    INTEGRATION_STATUS_INVOICED: 'Pazar Yerine Statü Gönderildi (Faturalı)',
    WAYBILL_CREATED: 'İrsaliye Kesildi',
    CARGO_CREATED: 'Kargo Kaydı Oluşturuldu',
    CARGO_LABEL_FETCHED: 'Kargo Etiketi Alındı',
    INVOICED: 'Faturalandı',
    SHIPPED: 'Kargoya Verildi',
    DELIVERED: 'Teslim Edildi',
    CANCELLED: 'İptal Edildi',
    RETURNED: 'İade Edildi',
    STATUS_CHANGED: 'Durum Değişti',
    NOTE_ADDED: 'Not Eklendi',
};

const movementTypeLabels: Record<string, string> = {
    PICKING: 'Toplama',
    PACKING_IN: 'Paketleme Girişi',
    PACKING_OUT: 'Paketleme Çıkışı',
    RECEIVING: 'Mal Kabul',
    TRANSFER: 'Transfer',
    ADJUSTMENT: 'Düzeltme',
    RETURN: 'İade',
    CANCEL: 'İptal',
};

const movementTypeColors: Record<string, string> = {
    PICKING: 'bg-blue-500',
    PACKING_IN: 'bg-purple-500',
    PACKING_OUT: 'bg-green-500',
    RECEIVING: 'bg-yellow-500',
    TRANSFER: 'bg-gray-500',
    ADJUSTMENT: 'bg-orange-500',
    RETURN: 'bg-red-500',
    CANCEL: 'bg-red-600',
};

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
    }).format(amount);
}

export function OrderDetailClient({ orderId }: Props) {
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [timeline, setTimeline] = useState<OrderHistoryEvent[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reshipModalOpen, setReshipModalOpen] = useState(false);
    const [labelLoading, setLabelLoading] = useState(false);

    // Etiket görüntülenebilir statüler
    const labelVisibleStatuses = [
        OrderStatus.PACKED,
        OrderStatus.INVOICED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
    ];

    const handlePrintLabel = async () => {
        setLabelLoading(true);
        try {
            const data = await getOrderCargoLabel(orderId);
            if (data.html) {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(data.html);
                    printWindow.document.close();
                }
            } else {
                alert('Etiket bulunamadı');
            }
        } catch (err: any) {
            alert(err.message || 'Etiket alınamadı');
        } finally {
            setLabelLoading(false);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [orderRes, timelineRes, movementsRes] = await Promise.all([
                getOrder(orderId),
                getOrderTimeline(orderId),
                getOrderStockMovements(orderId),
            ]);
            setOrder(orderRes.data);
            setTimeline(timelineRes.data);
            setStockMovements(movementsRes.data || []);
        } catch (err: any) {
            setError(err.message || 'Sipariş yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <p className="text-red-600">{error || 'Sipariş bulunamadı'}</p>
                <Button variant="outline" onClick={() => router.push('/orders')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Siparişlere Dön
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/orders">Siparişler</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{order.orderNumber}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.push('/orders')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {order.status === 'DELIVERED' && (
                        <Button
                            variant="outline"
                            onClick={() => setReshipModalOpen(true)}
                            className="flex items-center gap-2"
                        >
                            <Package className="h-4 w-4" />
                            Yeniden Gönder
                        </Button>
                    )}
                    <Badge className={statusColors[order.status] || statusColors.UNKNOWN}>
                        {statusLabels[order.status] || order.status}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="h-5 w-5" />
                                Sipariş Bilgileri
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Sipariş Tarihi</p>
                                <p className="font-medium flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {order.orderDate ? formatDate(order.orderDate) : '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                                <p className="font-medium">{formatCurrency(order.totalPrice || 0)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Mağaza</p>
                                <p className="font-medium">{order.store?.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Mağaza Tipi</p>
                                <p className="font-medium">{order.store?.type || '-'}</p>
                            </div>
                            {order.cargoTrackingNumber && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Kargo Takip No</p>
                                    <p className="font-medium flex items-center gap-1">
                                        <Truck className="h-4 w-4" />
                                        {order.cargoTrackingNumber}
                                    </p>
                                </div>
                            )}
                            {order.agreedDeliveryDate && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Tahmini Teslimat</p>
                                    <p className="font-medium">{formatDate(order.agreedDeliveryDate)}</p>
                                </div>
                            )}
                            {labelVisibleStatuses.includes(order.status as OrderStatus) && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Kargo Etiketi</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrintLabel}
                                        disabled={labelLoading}
                                        className="mt-1"
                                    >
                                        {labelLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Printer className="h-4 w-4 mr-2" />
                                        )}
                                        Etiketi Yazdır
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {order.customer && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Müşteri Bilgileri
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <User className="h-4 w-4 mt-1 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">
                                            {order.customer.firstName} {order.customer.lastName}
                                        </p>
                                        {order.customer.email && (
                                            <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                                        )}
                                        {order.customer.phone && (
                                            <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
                                        )}
                                    </div>
                                </div>
                                {order.customer.address && (
                                    <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <p className="text-sm">{order.customer.address}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {order.items && order.items.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Sipariş Kalemleri</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ürün</TableHead>
                                            <TableHead>Barkod</TableHead>
                                            <TableHead className="text-right">Adet</TableHead>
                                            <TableHead className="text-right">Birim Fiyat</TableHead>
                                            <TableHead className="text-right">Toplam</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {order.items.map((item, index) => (
                                            <TableRow key={item.id || index}>
                                                <TableCell className="font-medium">
                                                    {item.productName || '-'}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {item.barcode}
                                                </TableCell>
                                                <TableCell className="text-right">{item.quantity}</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(item.unitPrice || 0)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency((item.unitPrice || 0) * item.quantity)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Sipariş Geçmişi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
                                <div className="space-y-4">
                                    {order && (
                                        <div className="relative pl-8">
                                            <div className="absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-white bg-emerald-500">
                                                <Package className="h-4 w-4" />
                                            </div>
                                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-medium text-sm text-emerald-800">
                                                        Sipariş Geldi
                                                        {order.store?.name && (
                                                            <span className="ml-2 text-xs font-normal text-emerald-600">
                                                                ({order.store.name})
                                                            </span>
                                                        )}
                                                    </p>
                                                    <time className="text-xs text-emerald-600 whitespace-nowrap font-medium">
                                                        {order.orderDate ? formatDate(order.orderDate) : '-'}
                                                    </time>
                                                </div>
                                                <p className="text-sm text-emerald-700 mt-1">
                                                    Sipariş #{order.orderNumber} sisteme alındı
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {timeline.map((event) => (
                                        <div key={event.id} className="relative pl-8">
                                            <div
                                                className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-white ${actionColors[event.action] || 'bg-gray-500'}`}
                                            >
                                                {actionIcons[event.action] || <Circle className="h-3 w-3" />}
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-medium text-sm">
                                                        {actionLabels[event.action] || event.action}
                                                    </p>
                                                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                                                        {formatDate(event.createdAt)}
                                                    </time>
                                                </div>
                                                {event.description && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {event.description}
                                                    </p>
                                                )}
                                                {event.userName && (
                                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {event.userName}
                                                    </p>
                                                )}
                                                {event.routeName && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Route className="h-3 w-3" />
                                                        {event.routeName}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {timeline.length === 0 && !order && (
                                        <p className="text-muted-foreground text-sm text-center py-4">
                                            Henüz geçmiş kaydı yok
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stock Movements */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ArrowLeftRight className="h-5 w-5" />
                                Stok Hareketleri
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {stockMovements.length === 0 ? (
                                <p className="text-muted-foreground text-sm text-center py-4">
                                    Stok hareketi bulunamadı
                                </p>
                            ) : (
                                <div className="relative">
                                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
                                    <div className="space-y-4">
                                        {stockMovements.map((movement) => (
                                            <div key={movement.id} className="relative pl-8">
                                                <div
                                                    className={`absolute left-0 w-6 h-6 rounded-full flex items-center justify-center text-white ${movementTypeColors[movement.type] || 'bg-gray-500'}`}
                                                >
                                                    {movement.direction === 'IN' ? (
                                                        <ArrowDownLeft className="h-3 w-3" />
                                                    ) : (
                                                        <ArrowUpRight className="h-3 w-3" />
                                                    )}
                                                </div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-medium text-sm">
                                                            {movementTypeLabels[movement.type] || movement.type}
                                                            <span className="text-muted-foreground font-normal ml-1">
                                                                ({movement.direction === 'IN' ? 'Giriş' : 'Çıkış'})
                                                            </span>
                                                        </p>
                                                        <time className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {formatDate(movement.createdAt)}
                                                        </time>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {movement.product?.name || 'Ürün'} - {movement.direction === 'IN' ? '+' : '-'}{movement.quantity} adet
                                                    </p>
                                                    {movement.shelf && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <Package className="h-3 w-3" />
                                                            {movement.shelf.name}
                                                            {movement.sourceShelf && movement.targetShelf && (
                                                                <span>({movement.sourceShelf.name} → {movement.targetShelf.name})</span>
                                                            )}
                                                        </p>
                                                    )}
                                                    {movement.user && (
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {movement.user.firstName} {movement.user.lastName}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Reshipment Modal */}
            {order && (
                <ReshipmentModal
                    isOpen={reshipModalOpen}
                    onClose={() => setReshipModalOpen(false)}
                    order={order}
                />
            )}
        </div>
    );
}
