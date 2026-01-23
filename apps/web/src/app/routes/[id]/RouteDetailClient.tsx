'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getRoute,
    deleteRoute,
    printRouteLabel,
    Route,
    RouteStatus,
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
    Printer,
    Tag,
    Package,
    Trash2,
    FileText,
    AlertCircle,
} from 'lucide-react';

interface Props {
    routeId: string;
}

export function RouteDetailClient({ routeId }: Props) {
    const router = useRouter();
    const [route, setRoute] = useState<Route | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRoute = useCallback(async () => {
        setLoading(true);
        try {
            const response = await getRoute(routeId);
            setRoute(response.data);
        } catch (err: any) {
            setError(err.message || 'Rota yüklenemedi');
        } finally {
            setLoading(false);
        }
    }, [routeId]);

    useEffect(() => { fetchRoute(); }, [fetchRoute]);

    const handlePrintRoute = async () => {
        try {
            const labelHtml = await printRouteLabel(routeId);
            const blob = new Blob([labelHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error('Print failed:', err);
        }
    };

    const handlePrintLabel = async () => {
        try {
            const labelHtml = await printRouteLabel(routeId);
            const blob = new Blob([labelHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (err) {
            console.error('Print label failed:', err);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Bu rotayı iptal etmek istediğinize emin misiniz?')) return;
        try {
            await deleteRoute(routeId);
            router.push('/routes');
        } catch (err) {
            console.error('Cancel failed:', err);
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
        return <Badge variant={variant} className="text-sm px-3 py-1">{label}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !route) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <p className="text-muted-foreground">{error || 'Rota bulunamadı'}</p>
                <Button variant="outline" onClick={() => router.push('/routes')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Rotalara Dön
                </Button>
            </div>
        );
    }

    const calculateOrderItemCount = (order: any): number => {
        if (order.items && Array.isArray(order.items)) {
            return order.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
        }
        if (order.totalQuantity) {
            return order.totalQuantity;
        }
        return 0;
    };

    return (
        <div className="space-y-6">
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
                                <Link href="/routes">Rotalar</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{route.name}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                {getStatusBadge(route.status)}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info Card */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Rota Bilgileri
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Rota Takip Kodu</p>
                                <p className="font-mono font-semibold">{route.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Rota Adı</p>
                                <p className="font-semibold">{route.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Açıklama</p>
                                <p className="font-medium">{route.description || '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Oluşturma Zamanı</p>
                                <p className="font-medium">{new Date(route.createdAt).toLocaleString('tr-TR')}</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-4 gap-4 text-center">
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-2xl font-bold text-primary">{route.totalOrderCount}</p>
                                <p className="text-xs text-muted-foreground">Toplam Sipariş</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-2xl font-bold text-blue-600">{route.totalItemCount}</p>
                                <p className="text-xs text-muted-foreground">Toplam Ürün</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-2xl font-bold text-green-600">{route.pickedItemCount || 0}</p>
                                <p className="text-xs text-muted-foreground">Toplanan Ürün</p>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-2xl font-bold text-orange-600">{route.packedOrderCount || 0}</p>
                                <p className="text-xs text-muted-foreground">Paketlenen</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">İşlemler</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handlePrintRoute}
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Rotayı Yazdır
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handlePrintLabel}
                        >
                            <Tag className="w-4 h-4 mr-2" />
                            Rota Etiketini Yazdır
                        </Button>

                        <Separator />

                        {route.status === RouteStatus.COLLECTING && (
                            <Button
                                className="w-full justify-start"
                                onClick={() => router.push(`/picking?route=${routeId}`)}
                            >
                                <Package className="w-4 h-4 mr-2" />
                                Toplamaya Git
                            </Button>
                        )}

                        {route.status === RouteStatus.READY && (
                            <Button
                                className="w-full justify-start bg-green-600 hover:bg-green-700"
                                onClick={() => router.push('/packing')}
                            >
                                <Package className="w-4 h-4 mr-2" />
                                Paketlemeye Git
                            </Button>
                        )}

                        <Button
                            variant="secondary"
                            className="w-full justify-start"
                            disabled
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Toplu Faturalama ve Paketleme
                        </Button>

                        {route.status !== RouteStatus.COMPLETED && route.status !== RouteStatus.CANCELLED && (
                            <>
                                <Separator />
                                <Button
                                    variant="destructive"
                                    className="w-full justify-start"
                                    onClick={handleCancel}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Rotayı İptal Et
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Orders Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Rota Siparişleri</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Sipariş No</TableHead>
                                <TableHead>Müşteri</TableHead>
                                <TableHead className="text-center">Ürün Adedi</TableHead>
                                <TableHead>Durum</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {route.orders && route.orders.length > 0 ? (
                                route.orders.map((order: any, idx: number) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                                        <TableCell className="font-medium">
                                            {order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                                        </TableCell>
                                        <TableCell>
                                            {order.customer
                                                ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || '-'
                                                : '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary">
                                                {calculateOrderItemCount(order)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {order.status || 'Rotada'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        Bu rotada sipariş bulunmuyor
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
