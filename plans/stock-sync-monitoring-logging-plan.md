# Stok Senkronizasyon Loglama ve Monitoring Planı

Bu belge, [`automatic-marketplace-stock-sync-plan.md`](automatic-marketplace-stock-sync-plan.md) dökümanına ek olarak hazırlanmıştır.

## 1. Loglama Yapısı

### 1.1 Mevcut Altyapı

Sistemde mevcut [`OrderApiLog`](../apps/api/src/orders/entities/order-api-log.entity.ts) yapısını kullanacağız:

```typescript
export enum ApiLogProvider {
    ARAS_KARGO = 'ARAS_KARGO',
    TRENDYOL = 'TRENDYOL',
    HEPSIBURADA = 'HEPSIBURADA',
    IKAS = 'IKAS',
    UYUMSOFT = 'UYUMSOFT',
}

export enum ApiLogType {
    SET_ORDER = 'SET_ORDER',
    GET_BARCODE = 'GET_BARCODE',
    UPDATE_STATUS = 'UPDATE_STATUS',
    GET_ORDER = 'GET_ORDER',
    CREATE_INVOICE = 'CREATE_INVOICE',
    SYNC_STOCK = 'SYNC_STOCK',  // YENİ TİP EKLENECEK
    OTHER = 'OTHER',
}
```

### 1.2 StockSyncLog Entity

Stok senkronizasyonu için özel log entity:

```typescript
// apps/api/src/stock-sync/entities/stock-sync-log.entity.ts

import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Store } from '../../stores/entities/store.entity';
import { ApiLogProvider } from '../../orders/entities/order-api-log.entity';

export enum SyncStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    RATE_LIMITED = 'RATE_LIMITED',
}

@Entity('stock_sync_logs')
export class StockSyncLog extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Batch işlem ID'si (aynı batch'deki tüm logları gruplamak için)
    @Column({ name: 'batch_id', type: 'uuid' })
    batchId: string;

    @Column({ name: 'store_id', type: 'uuid' })
    storeId: string;

    @ManyToOne(() => Store)
    @JoinColumn({ name: 'store_id' })
    store: Store;

    @Column({
        type: 'enum',
        enum: ApiLogProvider,
    })
    provider: ApiLogProvider;

    @Column({
        name: 'sync_status',
        type: 'enum',
        enum: SyncStatus,
        default: SyncStatus.PENDING,
    })
    syncStatus: SyncStatus;

    @Column({ name: 'total_items', type: 'int', default: 0 })
    totalItems: number;

    @Column({ name: 'success_items', type: 'int', default: 0 })
    successItems: number;

    @Column({ name: 'failed_items', type: 'int', default: 0 })
    failedItems: number;

    @Column({ name: 'endpoint', type: 'varchar', length: 500, nullable: true })
    endpoint: string;

    @Column({ name: 'method', type: 'varchar', length: 10, nullable: true })
    method: string;

    @Column({ name: 'request_payload', type: 'longtext', nullable: true })
    requestPayload: string;

    @Column({ name: 'response_payload', type: 'longtext', nullable: true })
    responsePayload: string;

    @Column({ name: 'status_code', type: 'int', nullable: true })
    statusCode: number;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'duration_ms', type: 'int', nullable: true })
    durationMs: number;

    // Trendyol batch request ID
    @Column({ name: 'batch_request_id', nullable: true })
    batchRequestId: string;

    // Detaylı ürün bilgileri (JSON)
    @Column({ name: 'product_details', type: 'json', nullable: true })
    productDetails: Array<{
        barcode: string;
        productName: string;
        oldQuantity: number;
        newQuantity: number;
        isSetProduct: boolean;
    }>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
```

### 1.3 Migration

```typescript
// apps/api/src/database/migrations/XXXXXXXXXXXXXX-CreateStockSyncLogsTable.ts

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateStockSyncLogsTableXXXXXXXXXXXXXX implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'stock_sync_logs',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'UUID()',
                    },
                    {
                        name: 'batch_id',
                        type: 'uuid',
                    },
                    {
                        name: 'store_id',
                        type: 'uuid',
                    },
                    {
                        name: 'provider',
                        type: 'enum',
                        enum: ['ARAS_KARGO', 'TRENDYOL', 'HEPSIBURADA', 'IKAS', 'UYUMSOFT'],
                    },
                    {
                        name: 'sync_status',
                        type: 'enum',
                        enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'RATE_LIMITED'],
                        default: "'PENDING'",
                    },
                    {
                        name: 'total_items',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'success_items',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'failed_items',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'endpoint',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'method',
                        type: 'varchar',
                        length: '10',
                        isNullable: true,
                    },
                    {
                        name: 'request_payload',
                        type: 'longtext',
                        isNullable: true,
                    },
                    {
                        name: 'response_payload',
                        type: 'longtext',
                        isNullable: true,
                    },
                    {
                        name: 'status_code',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'error_message',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'duration_ms',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'batch_request_id',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'product_details',
                        type: 'json',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true
        );

        await queryRunner.createIndex(
            'stock_sync_logs',
            new TableIndex({
                name: 'IDX_stock_sync_logs_batch',
                columnNames: ['batch_id'],
            })
        );

        await queryRunner.createIndex(
            'stock_sync_logs',
            new TableIndex({
                name: 'IDX_stock_sync_logs_store',
                columnNames: ['store_id'],
            })
        );

        await queryRunner.createIndex(
            'stock_sync_logs',
            new TableIndex({
                name: 'IDX_stock_sync_logs_status',
                columnNames: ['sync_status'],
            })
        );

        await queryRunner.createIndex(
            'stock_sync_logs',
            new TableIndex({
                name: 'IDX_stock_sync_logs_created',
                columnNames: ['created_at'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('stock_sync_logs');
    }
}
```

## 2. Loglama Entegrasyonu

### 2.1 StockSyncService'e Loglama Ekleme

```typescript
private async sendToTrendyol(
    store: Store,
    items: StockUpdateItem[]
): Promise<void> {
    const batchId = uuid();
    const startTime = Date.now();

    // Ürün detaylarını hazırla
    const productDetails = await this.prepareProductDetails(items, store.id);

    // Log kaydı oluştur - BAŞLANGIÇ
    const logEntry = await this.stockSyncLogRepository.save({
        batchId,
        storeId: store.id,
        provider: ApiLogProvider.TRENDYOL,
        syncStatus: SyncStatus.PROCESSING,
        totalItems: items.length,
        endpoint: `https://apigw.trendyol.com/integration/inventory/sellers/${store.sellerId}/products/price-and-inventory`,
        method: 'POST',
        requestPayload: JSON.stringify({ items }),
        productDetails,
    });

    try {
        const url = `https://apigw.trendyol.com/integration/inventory/sellers/${store.sellerId}/products/price-and-inventory`;
        const auth = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items })
        });

        const responseData = await response.json();
        const durationMs = Date.now() - startTime;

        if (!response.ok) {
            throw new Error(`Trendyol API error: ${response.status} - ${JSON.stringify(responseData)}`);
        }

        // Başarılı log güncelleme - SUCCESS
        await this.stockSyncLogRepository.update(logEntry.id, {
            syncStatus: SyncStatus.SUCCESS,
            successItems: items.length,
            statusCode: response.status,
            responsePayload: JSON.stringify(responseData),
            durationMs,
            batchRequestId: responseData.batchRequestId,
        });

        this.logger.log(`✅ Trendyol stok güncelleme başarılı: ${items.length} ürün (${durationMs}ms) - Batch: ${batchId}`);

    } catch (error) {
        const durationMs = Date.now() - startTime;

        // Hata logu - FAILED
        await this.stockSyncLogRepository.update(logEntry.id, {
            syncStatus: SyncStatus.FAILED,
            failedItems: items.length,
            errorMessage: error.message,
            durationMs,
        });

        this.logger.error(`❌ Trendyol stok güncelleme hatası: ${error.message} - Batch: ${batchId}`);
        throw error;
    }
}

/**
 * Ürün detaylarını hazırla (loglama için)
 */
private async prepareProductDetails(
    items: StockUpdateItem[],
    storeId: string
): Promise<Array<{
    barcode: string;
    productName: string;
    oldQuantity: number;
    newQuantity: number;
    isSetProduct: boolean;
}>> {
    const details = [];

    for (const item of items) {
        const product = await this.productRepository.findOne({
            where: { barcode: item.barcode }
        });

        if (!product) continue;

        const productStore = await this.productStoreRepository.findOne({
            where: { productId: product.id, storeId }
        });

        details.push({
            barcode: item.barcode,
            productName: product.name,
            oldQuantity: productStore?.sellableQuantity || 0,
            newQuantity: item.quantity,
            isSetProduct: product.productType === ProductType.SET,
        });
    }

    return details;
}
```

## 3. Monitoring API

### 3.1 Controller

```typescript
// apps/api/src/stock-sync/stock-sync.controller.ts

import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockSyncService } from './stock-sync.service';
import { ApiLogProvider } from '../orders/entities/order-api-log.entity';
import { SyncStatus } from './entities/stock-sync-log.entity';

@Controller('stock-sync')
@UseGuards(JwtAuthGuard)
export class StockSyncController {
    constructor(private readonly stockSyncService: StockSyncService) {}

    /**
     * GET /stock-sync/logs
     * Stok senkronizasyon loglarını listele
     */
    @Get('logs')
    async getLogs(
        @Query('storeId') storeId?: string,
        @Query('provider') provider?: ApiLogProvider,
        @Query('status') status?: SyncStatus,
        @Query('from') from?: string,
        @Query('to') to?: string,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 50,
    ) {
        return this.stockSyncService.getLogs({
            storeId,
            provider,
            status,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
            page: Number(page),
            limit: Number(limit),
        });
    }

    /**
     * GET /stock-sync/logs/:id
     * Log detayını getir
     */
    @Get('logs/:id')
    async getLogDetail(@Param('id') id: string) {
        return this.stockSyncService.getLogDetail(id);
    }

    /**
     * GET /stock-sync/stats
     * İstatistikler
     */
    @Get('stats')
    async getStats(
        @Query('storeId') storeId?: string,
        @Query('from') from?: string,
        @Query('to') to?: string,
    ) {
        return this.stockSyncService.getStats({
            storeId,
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
        });
    }

    /**
     * GET /stock-sync/queue-status
     * Kuyruk durumu
     */
    @Get('queue-status')
    async getQueueStatus() {
        return this.stockSyncService.getQueueStatus();
    }

    /**
     * POST /stock-sync/retry/:id
     * Başarısız logu tekrar dene
     */
    @Post('retry/:id')
    async retryLog(@Param('id') id: string) {
        return this.stockSyncService.retryFailedLog(id);
    }
}
```

### 3.2 Service Metotları

```typescript
// StockSyncService içine eklenecek metotlar

async getLogs(filter: {
    storeId?: string;
    provider?: ApiLogProvider;
    status?: SyncStatus;
    from?: Date;
    to?: Date;
    page: number;
    limit: number;
}): Promise<{
    data: StockSyncLog[];
    total: number;
    page: number;
    totalPages: number;
}> {
    const query = this.stockSyncLogRepository.createQueryBuilder('log')
        .leftJoinAndSelect('log.store', 'store')
        .orderBy('log.createdAt', 'DESC');

    if (filter.storeId) {
        query.andWhere('log.storeId = :storeId', { storeId: filter.storeId });
    }

    if (filter.provider) {
        query.andWhere('log.provider = :provider', { provider: filter.provider });
    }

    if (filter.status) {
        query.andWhere('log.syncStatus = :status', { status: filter.status });
    }

    if (filter.from) {
        query.andWhere('log.createdAt >= :from', { from: filter.from });
    }

    if (filter.to) {
        query.andWhere('log.createdAt <= :to', { to: filter.to });
    }

    const total = await query.getCount();
    const data = await query
        .skip((filter.page - 1) * filter.limit)
        .take(filter.limit)
        .getMany();

    return {
        data,
        total,
        page: filter.page,
        totalPages: Math.ceil(total / filter.limit),
    };
}

async getLogDetail(id: string): Promise<StockSyncLog> {
    return this.stockSyncLogRepository.findOne({
        where: { id },
        relations: ['store'],
    });
}

async getStats(filter: {
    storeId?: string;
    from?: Date;
    to?: Date;
}): Promise<{
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
        timestamp: Date;
        store: string;
        provider: string;
        error: string;
    }>;
}> {
    const query = this.stockSyncLogRepository.createQueryBuilder('log');

    if (filter.storeId) {
        query.andWhere('log.storeId = :storeId', { storeId: filter.storeId });
    }

    if (filter.from) {
        query.andWhere('log.createdAt >= :from', { from: filter.from });
    }

    if (filter.to) {
        query.andWhere('log.createdAt <= :to', { to: filter.to });
    }

    const logs = await query.getMany();

    const totalSyncs = logs.length;
    const successCount = logs.filter(l => l.syncStatus === SyncStatus.SUCCESS).length;
    const successRate = totalSyncs > 0 ? (successCount / totalSyncs) * 100 : 0;
    
    const durations = logs.filter(l => l.durationMs).map(l => l.durationMs);
    const avgDuration = durations.length > 0 
        ? durations.reduce((a, b) => a + b, 0) / durations.length 
        : 0;

    const totalItems = logs.reduce((sum, l) => sum + l.totalItems, 0);

    // Provider bazında istatistik
    const byProvider: Record<string, any> = {};
    for (const provider of Object.values(ApiLogProvider)) {
        const providerLogs = logs.filter(l => l.provider === provider);
        if (providerLogs.length > 0) {
            const providerDurations = providerLogs.filter(l => l.durationMs).map(l => l.durationMs);
            byProvider[provider] = {
                total: providerLogs.length,
                success: providerLogs.filter(l => l.syncStatus === SyncStatus.SUCCESS).length,
                failed: providerLogs.filter(l => l.syncStatus === SyncStatus.FAILED).length,
                avgDuration: providerDurations.length > 0 
                    ? providerDurations.reduce((a, b) => a + b, 0) / providerDurations.length 
                    : 0,
            };
        }
    }

    // Son 10 hata
    const recentErrors = await this.stockSyncLogRepository.find({
        where: { syncStatus: SyncStatus.FAILED },
        order: { createdAt: 'DESC' },
        take: 10,
        relations: ['store'],
    });

    return {
        totalSyncs,
        successRate,
        avgDuration,
        totalItems,
        byProvider,
        recentErrors: recentErrors.map(e => ({
            timestamp: e.createdAt,
            store: e.store?.name || 'Unknown',
            provider: e.provider,
            error: e.errorMessage || 'No error message',
        })),
    };
}

async getQueueStatus(): Promise<{
    pending: number;
    oldestPending: Date | null;
    byStore: Record<string, number>;
}> {
    const pendingItems = await this.queueRepository.find({
        where: { processedAt: IsNull() },
        relations: ['product', 'store'],
    });

    const pending = pendingItems.length;
    const oldestPending = pendingItems.length > 0 
        ? pendingItems.reduce((oldest, item) => 
            item.createdAt < oldest ? item.createdAt : oldest, 
            pendingItems[0].createdAt
          )
        : null;

    const byStore: Record<string, number> = {};
    for (const item of pendingItems) {
        const storeName = item.store?.name || item.storeId;
        byStore[storeName] = (byStore[storeName] || 0) + 1;
    }

    return {
        pending,
        oldestPending,
        byStore,
    };
}

async retryFailedLog(id: string): Promise<{ success: boolean; message: string }> {
    const log = await this.stockSyncLogRepository.findOne({
        where: { id },
        relations: ['store'],
    });

    if (!log) {
        return { success: false, message: 'Log bulunamadı' };
    }

    if (log.syncStatus !== SyncStatus.FAILED) {
        return { success: false, message: 'Sadece başarısız loglar tekrar denenebilir' };
    }

    // Request payload'ı parse et
    const requestData = JSON.parse(log.requestPayload);
    const items = requestData.items;

    // Tekrar dene
    try {
        if (log.provider === ApiLogProvider.TRENDYOL) {
            await this.sendToTrendyol(log.store, items);
        } else if (log.provider === ApiLogProvider.HEPSIBURADA) {
            await this.sendToHepsiburada(log.store, items);
        }

        return { success: true, message: 'Stok senkronizasyonu başarıyla tekrarlandı' };
    } catch (error) {
        return { success: false, message: `Hata: ${error.message}` };
    }
}
```

## 4. Frontend Dashboard

### 4.1 Ana Monitoring Ekranı

```typescript
// apps/web/src/app/stock-sync/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, Tabs, Badge, Table, Button } from '@/components/ui';
import { apiClient } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function StockSyncMonitoringPage() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [queueStatus, setQueueStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
        // Her 30 saniyede bir güncelle
        const interval = setInterval(loadDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadDashboardData = async () => {
        try {
            const [statsRes, logsRes, queueRes] = await Promise.all([
                apiClient.get('/stock-sync/stats'),
                apiClient.get('/stock-sync/logs?limit=20'),
                apiClient.get('/stock-sync/queue-status'),
            ]);

            setStats(statsRes.data);
            setLogs(logsRes.data.data);
            setQueueStatus(queueRes.data);
        } catch (error) {
            console.error('Dashboard yükleme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            SUCCESS: 'bg-green-100 text-green-800',
            FAILED: 'bg-red-100 text-red-800',
            PROCESSING: 'bg-blue-100 text-blue-800',
            RATE_LIMITED: 'bg-yellow-100 text-yellow-800',
        };

        const icons = {
            SUCCESS: '✅',
            FAILED: '❌',
            PROCESSING: '⏳',
            RATE_LIMITED: '⚠️',
        };

        return (
            <Badge className={colors[status]}>
                {icons[status]} {status}
            </Badge>
        );
    };

    if (loading) {
        return <div className="p-6">Yükleniyor...</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Stok Senkronizasyon Monitörü</h1>
                <Button onClick={loadDashboardData} variant="outline">
                    🔄 Yenile
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Trigger value="dashboard">Dashboard</Tabs.Trigger>
                    <Tabs.Trigger value="logs">Loglar</Tabs.Trigger>
                    <Tabs.Trigger value="queue">Kuyruk</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="dashboard">
                    {/* İstatistik Kartları */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <Card.Header>
                                <Card.Title>Toplam Senkronizasyon</Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <div className="text-3xl font-bold">{stats?.totalSyncs || 0}</div>
                            </Card.Content>
                        </Card>

                        <Card>
                            <Card.Header>
                                <Card.Title>Başarı Oranı</Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <div className="text-3xl font-bold text-green-600">
                                    {stats?.successRate?.toFixed(1) || 0}%
                                </div>
                            </Card.Content>
                        </Card>

                        <Card>
                            <Card.Header>
                                <Card.Title>Ortalama Süre</Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <div className="text-3xl font-bold">
                                    {stats?.avgDuration?.toFixed(0) || 0}ms
                                </div>
                            </Card.Content>
                        </Card>

                        <Card>
                            <Card.Header>
                                <Card.Title>Bekleyen</Card.Title>
                            </Card.Header>
                            <Card.Content>
                                <div className="text-3xl font-bold text-yellow-600">
                                    {queueStatus?.pending || 0}
                                </div>
                            </Card.Content>
                        </Card>
                    </div>

                    {/* Provider Bazlı İstatistikler */}
                    <Card className="mb-6">
                        <Card.Header>
                            <Card.Title>Pazaryeri Bazlı Durum</Card.Title>
                        </Card.Header>
                        <Card.Content>
                            <Table>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.Head>Pazaryeri</Table.Head>
                                        <Table.Head>Toplam</Table.Head>
                                        <Table.Head>Başarılı</Table.Head>
                                        <Table.Head>Başarısız</Table.Head>
                                        <Table.Head>Ort. Süre</Table.Head>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {Object.entries(stats?.byProvider || {}).map(([provider, data]: [string, any]) => (
                                        <Table.Row key={provider}>
                                            <Table.Cell className="font-medium">{provider}</Table.Cell>
                                            <Table.Cell>{data.total}</Table.Cell>
                                            <Table.Cell className="text-green-600">{data.success}</Table.Cell>
                                            <Table.Cell className="text-red-600">{data.failed}</Table.Cell>
                                            <Table.Cell>{data.avgDuration?.toFixed(0)}ms</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table>
                        </Card.Content>
                    </Card>

                    {/* Son Loglar */}
                    <Card>
                        <Card.Header>
                            <Card.Title>Son Senkronizasyonlar</Card.Title>
                        </Card.Header>
                        <Card.Content>
                            <Table>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.Head>Tarih</Table.Head>
                                        <Table.Head>Mağaza</Table.Head>
                                        <Table.Head>Pazaryeri</Table.Head>
                                        <Table.Head>Ürün Sayısı</Table.Head>
                                        <Table.Head>Durum</Table.Head>
                                        <Table.Head>Süre</Table.Head>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {logs.map((log: any) => (
                                        <Table.Row key={log.id}>
                                            <Table.Cell>
                                                {formatDistanceToNow(new Date(log.createdAt), { 
                                                    addSuffix: true, 
                                                    locale: tr 
                                                })}
                                            </Table.Cell>
                                            <Table.Cell>{log.store?.name}</Table.Cell>
                                            <Table.Cell>{log.provider}</Table.Cell>
                                            <Table.Cell>{log.totalItems}</Table.Cell>
                                            <Table.Cell>{getStatusBadge(log.syncStatus)}</Table.Cell>
                                            <Table.Cell>{log.durationMs}ms</Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table>
                        </Card.Content>
                    </Card>
                </Tabs.Content>

                <Tabs.Content value="logs">
                    <Card>
                        <Card.Header>
                            <Card.Title>Tüm Loglar</Card.Title>
                        </Card.Header>
                        <Card.Content>
                            {/* Filtreleme ve sayfalama ile tam log listesi */}
                            <p>Detaylı log ekranı burada olacak</p>
                        </Card.Content>
                    </Card>
                </Tabs.Content>

                <Tabs.Content value="queue">
                    <Card>
                        <Card.Header>
                            <Card.Title>Kuyruk Durumu</Card.Title>
                        </Card.Header>
                        <Card.Content>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-500">Bekleyen Toplam</p>
                                    <p className="text-2xl font-bold">{queueStatus?.pending || 0}</p>
                                </div>

                                {queueStatus?.oldestPending && (
                                    <div>
                                        <p className="text-sm text-gray-500">En Eski Bekleyen</p>
                                        <p className="text-lg">
                                            {formatDistanceToNow(new Date(queueStatus.oldestPending), { 
                                                addSuffix: true, 
                                                locale: tr 
                                            })}
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm text-gray-500 mb-2">Mağaza Bazlı Bekleyen</p>
                                    <Table>
                                        <Table.Header>
                                            <Table.Row>
                                                <Table.Head>Mağaza</Table.Head>
                                                <Table.Head>Bekleyen</Table.Head>
                                            </Table.Row>
                                        </Table.Header>
                                        <Table.Body>
                                            {Object.entries(queueStatus?.byStore || {}).map(([store, count]: [string, any]) => (
                                                <Table.Row key={store}>
                                                    <Table.Cell>{store}</Table.Cell>
                                                    <Table.Cell>{count}</Table.Cell>
                                                </Table.Row>
                                            ))}
                                        </Table.Body>
                                    </Table>
                                </div>
                            </div>
                        </Card.Content>
                    </Card>
                </Tabs.Content>
            </Tabs>
        </div>
    );
}
```

## 5. Implementasyon Sırası

1. ✅ StockSyncLog entity oluştur
2. ✅ Migration hazırla
3. ✅ StockSyncService'e loglama ekle
4. ✅ Monitoring API endpoint'leri
5. ✅ Frontend dashboard
6. Unit testler
7. Staging'de test
8. Production deployment

## 6. Metrikler ve Alarmlar

### 6.1 İzlenecek Metrikler

- Stok senkronizasyon başarı oranı
- Ortalama response süresi
- Kuyruk büyüklüğü
- Rate limit hit sayısı
- Hata oranları (provider bazlı)

### 6.2 Alarm Koşulları

- Başarı oranı < %95 ise
- Kuyruk > 1000 item ise
- Rate limit hit > 5 (15 dakikada) ise
- Ortalama süre > 5 saniye ise

Alarmlar Slack/Email ile bildirilmeli.
