'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface StockSyncLog {
    id: string;
    batchId: string;
    storeId: string;
    store: { id: string; name: string };
    provider: string;
    syncStatus: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'RATE_LIMITED';
    totalItems: number;
    successItems: number;
    failedItems: number;
    durationMs: number | null;
    errorMessage: string | null;
    createdAt: string;
}

interface StockSyncStats {
    totalSyncs: number;
    successRate: number;
    avgDuration: number;
    totalItems: number;
    byProvider: Record<string, {
        total: number;
        success: number;
        failed: number;
        avgDuration: number;
    }>;
    recentErrors: Array<{
        timestamp: string;
        store: string;
        provider: string;
        error: string;
    }>;
}

interface QueueStatus {
    pending: number;
    oldestPending: string | null;
    byStore: Record<string, number>;
}

export default function StockSyncMonitoringPage() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState<StockSyncStats | null>(null);
    const [logs, setLogs] = useState<StockSyncLog[]>([]);
    const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsPage, setLogsPage] = useState(1);
    const [logsTotalPages, setLogsTotalPages] = useState(1);

    const loadDashboardData = async () => {
        try {
            const [statsRes, logsRes, queueRes] = await Promise.all([
                fetch('/api/stock-sync/stats'),
                fetch('/api/stock-sync/logs?limit=20'),
                fetch('/api/stock-sync/queue-status'),
            ]);

            const [statsData, logsData, queueData] = await Promise.all([
                statsRes.json(),
                logsRes.json(),
                queueRes.json(),
            ]);

            setStats(statsData);
            setLogs(logsData.data || []);
            setLogsTotalPages(logsData.totalPages || 1);
            setQueueStatus(queueData);
        } catch (error) {
            console.error('Dashboard yükleme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadLogs = async (page: number = 1) => {
        setLogsLoading(true);
        try {
            const res = await fetch(`/api/stock-sync/logs?page=${page}&limit=50`);
            const data = await res.json();
            setLogs(data.data || []);
            setLogsTotalPages(data.totalPages || 1);
            setLogsPage(page);
        } catch (error) {
            console.error('Logs yükleme hatası:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const loadQueueStatus = async () => {
        try {
            const res = await fetch('/api/stock-sync/queue-status');
            const data = await res.json();
            setQueueStatus(data);
        } catch (error) {
            console.error('Queue status yükleme hatası:', error);
        }
    };

    const retryLog = async (id: string) => {
        try {
            const res = await fetch(`/api/stock-sync/retry/${id}`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                loadLogs(logsPage);
            }
        } catch (error) {
            console.error('Retry hatası:', error);
        }
    };

    useEffect(() => {
        loadDashboardData();
        // Her 30 saniyede bir güncelle
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'destructive' | 'outline' | 'secondary'; icon: React.ReactNode }> = {
            SUCCESS: { variant: 'default', icon: <CheckCircle2 className="w-4 h-4" /> },
            FAILED: { variant: 'destructive', icon: <XCircle className="w-4 h-4" /> },
            PROCESSING: { variant: 'secondary', icon: <Clock className="w-4 h-4" /> },
            RATE_LIMITED: { variant: 'outline', icon: <AlertCircle className="w-4 h-4" /> },
            PENDING: { variant: 'secondary', icon: <Clock className="w-4 h-4" /> },
        };

        const config = variants[status] || variants.PENDING;

        return (
            <Badge variant={config.variant as any} className="gap-1">
                {config.icon}
                {status}
            </Badge>
        );
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Stok Senkronizasyon Monitörü</h1>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}>
                            <CardHeader>
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Stok Senkronizasyon Monitörü</h1>
                <Button onClick={loadDashboardData} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Yenile
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="logs">Loglar</TabsTrigger>
                    <TabsTrigger value="queue">Kuyruk</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-6">
                    {/* İstatistik Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Senkronizasyon</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{stats?.totalSyncs || 0}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Başarı Oranı</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-600">
                                    {stats?.successRate?.toFixed(1) || 0}%
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Ortalama Süre</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">
                                    {stats?.avgDuration?.toFixed(0) || 0}ms
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-yellow-600">
                                    {queueStatus?.pending || 0}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Provider Bazlı İstatistikler */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Pazaryeri Bazlı Durum</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Pazaryeri</TableHead>
                                        <TableHead className="text-right">Toplam</TableHead>
                                        <TableHead className="text-right">Başarılı</TableHead>
                                        <TableHead className="text-right">Başarısız</TableHead>
                                        <TableHead className="text-right">Ort. Süre</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(stats?.byProvider || {}).map(([provider, data]: [string, any]) => (
                                        <TableRow key={provider}>
                                            <TableCell className="font-medium">{provider}</TableCell>
                                            <TableCell className="text-right">{data.total}</TableCell>
                                            <TableCell className="text-right text-green-600">{data.success}</TableCell>
                                            <TableCell className="text-right text-red-600">{data.failed}</TableCell>
                                            <TableCell className="text-right">{data.avgDuration?.toFixed(0)}ms</TableCell>
                                        </TableRow>
                                    ))}
                                    {(!stats?.byProvider || Object.keys(stats.byProvider).length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                                                Henüz senkronizasyon yapılmadı
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Son Hatalar */}
                    {stats?.recentErrors && stats.recentErrors.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Son Hatalar</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Zaman</TableHead>
                                            <TableHead>Mağaza</TableHead>
                                            <TableHead>Pazaryeri</TableHead>
                                            <TableHead>Hata</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {stats.recentErrors.map((error, i) => (
                                            <TableRow key={i}>
                                                <TableCell>
                                                    {formatDistanceToNow(new Date(error.timestamp), { addSuffix: true, locale: tr })}
                                                </TableCell>
                                                <TableCell>{error.store}</TableCell>
                                                <TableCell>{error.provider}</TableCell>
                                                <TableCell className="text-red-600">{error.error}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Son Senkronizasyonlar */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Son Senkronizasyonlar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Zaman</TableHead>
                                        <TableHead>Mağaza</TableHead>
                                        <TableHead>Pazaryeri</TableHead>
                                        <TableHead className="text-right">Ürün Sayısı</TableHead>
                                        <TableHead>Durum</TableHead>
                                        <TableHead className="text-right">Süre</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: tr })}
                                            </TableCell>
                                            <TableCell>{log.store?.name || '-'}</TableCell>
                                            <TableCell>{log.provider}</TableCell>
                                            <TableCell className="text-right">{log.totalItems}</TableCell>
                                            <TableCell>{getStatusBadge(log.syncStatus)}</TableCell>
                                            <TableCell className="text-right">{log.durationMs}ms</TableCell>
                                        </TableRow>
                                    ))}
                                    {logs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                                                Henüz senkronizasyon logu yok
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="logs" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tüm Loglar</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Zaman</TableHead>
                                        <TableHead>Batch ID</TableHead>
                                        <TableHead>Mağaza</TableHead>
                                        <TableHead>Pazaryeri</TableHead>
                                        <TableHead className="text-right">Ürün Sayısı</TableHead>
                                        <TableHead>Durum</TableHead>
                                        <TableHead className="text-right">Süre</TableHead>
                                        <TableHead>Hata</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: tr })}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{log.batchId.slice(0, 8)}...</TableCell>
                                            <TableCell>{log.store?.name || '-'}</TableCell>
                                            <TableCell>{log.provider}</TableCell>
                                            <TableCell className="text-right">{log.totalItems}</TableCell>
                                            <TableCell>{getStatusBadge(log.syncStatus)}</TableCell>
                                            <TableCell className="text-right">{log.durationMs}ms</TableCell>
                                            <TableCell className="text-red-600 max-w-xs truncate">{log.errorMessage || '-'}</TableCell>
                                            <TableCell>
                                                {log.syncStatus === 'FAILED' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => retryLog(log.id)}
                                                    >
                                                        Tekrar Dene
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {logs.length === 0 && !logsLoading && (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center text-muted-foreground">
                                                Henüz log bulunmuyor
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadLogs(logsPage - 1)}
                                    disabled={logsPage <= 1 || logsLoading}
                                >
                                    Önceki
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Sayfa {logsPage} / {logsTotalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => loadLogs(logsPage + 1)}
                                    disabled={logsPage >= logsTotalPages || logsLoading}
                                >
                                    Sonraki
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="queue" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Kuyruk Durumu</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Bekleyen Toplam</p>
                                    <p className="text-2xl font-bold">{queueStatus?.pending || 0}</p>
                                </div>

                                {queueStatus?.oldestPending && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">En Eski Bekleyen</p>
                                        <p className="text-lg">
                                            {formatDistanceToNow(new Date(queueStatus.oldestPending), { addSuffix: true, locale: tr })}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Mağaza Bazında Bekleyenler</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {queueStatus?.byStore && Object.keys(queueStatus.byStore).length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Mağaza</TableHead>
                                                <TableHead className="text-right">Bekleyen</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(queueStatus.byStore).map(([store, count]: [string, any]) => (
                                                <TableRow key={store}>
                                                    <TableCell>{store}</TableCell>
                                                    <TableCell className="text-right">{count}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <p className="text-muted-foreground">Bekleyen ürün yok</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
