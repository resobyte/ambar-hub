'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getRoute,
    deleteRoute,
    printRouteLabel,
    bulkProcessRoute,
    getRouteLabelsZpl,
    Route,
    RouteStatus,
    BulkProcessResult,
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Loader2,
    ArrowLeft,
    Printer,
    Tag,
    Package,
    Trash2,
    FileText,
    AlertCircle,
    CheckCircle2,
    Download,
} from 'lucide-react';

interface Props {
    routeId: string;
}

export function RouteDetailClient({ routeId }: Props) {
    const router = useRouter();
    const [route, setRoute] = useState<Route | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkProcessResult, setBulkProcessResult] = useState<BulkProcessResult | null>(null);
    const [showBulkProcessModal, setShowBulkProcessModal] = useState(false);

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

    const handleCancel = async () => {
        if (!confirm('Bu rotayı iptal etmek istediğinize emin misiniz?')) return;
        try {
            await deleteRoute(routeId);
            router.push('/routes');
        } catch (err) {
            console.error('Cancel failed:', err);
        }
    };

    const handleBulkProcess = async () => {
        setShowBulkProcessModal(false);
        setBulkProcessing(true);
        setBulkProcessResult(null);
        try {
            const response = await bulkProcessRoute(routeId);
            const result = response.data;
            setBulkProcessResult(result);
            
            // Refresh route data
            await fetchRoute();
            
            // Show summary
            const successCount = result.results.filter(r => !r.error).length;
            const errorCount = result.errors.length;
            
            if (errorCount > 0) {
                alert(`İşlem tamamlandı:\n✓ ${successCount}/${result.total} sipariş başarıyla işlendi\n✗ ${errorCount} siparişte hata oluştu\n\nHatalar:\n${result.errors.join('\n')}`);
            } else {
                alert(`İşlem başarıyla tamamlandı!\n✓ ${successCount} sipariş işlendi\n✓ ${result.results.filter(r => r.labelFetched).length} etiket oluşturuldu`);
            }
        } catch (err: any) {
            alert(`Toplu işlem başarısız: ${err.message || 'Bilinmeyen hata'}`);
        } finally {
            setBulkProcessing(false);
        }
    };

    const handlePrintAllLabels = async () => {
        try {
            const response = await getRouteLabelsZpl(routeId);
            const zplContent = response.data.zplContent;
            
            // ZPL dosyasını indir
            const blob = new Blob([zplContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${route?.name || 'labels'}.zpl`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert(`${response.data.orderCount} etiket ZPL dosyası indirildi.\n\nBu dosyayı ZPL uyumlu bir yazıcıya gönderebilirsiniz.`);
        } catch (err: any) {
            alert(`Etiket indirme başarısız: ${err.message || 'Bilinmeyen hata'}`);
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
                            Rota Etiketini Yazdır
                        </Button>

                        <Separator />

                        {route.status === RouteStatus.READY && (
                            <Button
                                variant="secondary"
                                className="w-full justify-start"
                                onClick={() => setShowBulkProcessModal(true)}
                                disabled={bulkProcessing}
                            >
                                {bulkProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        İşleniyor...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="w-4 h-4 mr-2" />
                                        Toplu Faturalama ve Etiketleme
                                    </>
                                )}
                            </Button>
                        )}

                        {bulkProcessResult && bulkProcessResult.processed > 0 && (
                            <Button
                                className="w-full justify-start bg-green-600 hover:bg-green-700"
                                onClick={handlePrintAllLabels}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Tüm Etiketleri İndir ({bulkProcessResult.processed} adet)
                            </Button>
                        )}

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

            {/* Bulk Process Confirmation Modal */}
            <Dialog open={showBulkProcessModal} onOpenChange={setShowBulkProcessModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Toplu Faturalama ve Etiketleme</DialogTitle>
                        <DialogDescription>
                            Rotadaki tüm siparişler için aşağıdaki işlemler yapılacak:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-4">
                        <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <p className="font-medium">Fatura Kesimi</p>
                                <p className="text-sm text-muted-foreground">Her sipariş için fatura kesilecek (E-Arşiv/E-Fatura/Mikro İhracat)</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Tag className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                                <p className="font-medium">Etiket Oluşturma</p>
                                <p className="text-sm text-muted-foreground">Aras Kargo'dan ZPL etiket çekilecek (başarısızsa dummy etiket)</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Download className="w-5 h-5 text-orange-600 mt-0.5" />
                            <div>
                                <p className="font-medium">Toplu Yazdırma</p>
                                <p className="text-sm text-muted-foreground">Tüm etiketler birleştirilip tek dosya olarak indirilebilir</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkProcessModal(false)}>
                            İptal
                        </Button>
                        <Button onClick={handleBulkProcess} disabled={bulkProcessing}>
                            {bulkProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    İşleniyor...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Başlat
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
