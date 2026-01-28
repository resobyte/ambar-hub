import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';

import { StockUpdateQueue } from './entities/stock-update-queue.entity';
import { StockSyncLog } from './entities/stock-sync-log.entity';
import { Product } from '../products/entities/product.entity';
import { ProductSetItem } from '../products/entities/product-set-item.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { Store } from '../stores/entities/store.entity';
import { ProductType } from '../products/enums/product-type.enum';
import { StoreType } from '../stores/entities/store.entity';
import { ApiLogProvider } from '../orders/entities/order-api-log.entity';
import { SyncStatus, StockUpdateReason } from './enums/stock-sync.enum';

interface StockUpdateItem {
    barcode: string;
    quantity: number;
    salePrice?: number;
}

interface ProductDetail {
    barcode: string;
    productName: string;
    oldQuantity: number;
    newQuantity: number;
    isSetProduct: boolean;
}

@Injectable()
export class StockSyncService implements OnModuleInit {
    private readonly logger = new Logger(StockSyncService.name);
    private readonly QUEUE_TTL = 300000; // 5 dakika
    private readonly BATCH_SIZE = 1000;
    private readonly TRENDYOL_RATE_LIMIT_MS = 900000; // 15 dakika

    // Rate limiting için son gönderim zamanları
    private lastSentTimestamps = new Map<string, Date>();

    constructor(
        @InjectRepository(StockUpdateQueue)
        private readonly queueRepository: Repository<StockUpdateQueue>,
        @InjectRepository(StockSyncLog)
        private readonly stockSyncLogRepository: Repository<StockSyncLog>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(ProductSetItem)
        private readonly productSetItemRepository: Repository<ProductSetItem>,
        @InjectRepository(ProductStore)
        private readonly productStoreRepository: Repository<ProductStore>,
        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,
    ) {}

    onModuleInit() {
        this.logger.log('StockSyncService initialized');
    }

    /**
     * Stok değişikliğini kuyruğa ekler
     */
    async enqueueStockUpdate(
        productId: string,
        storeId: string,
        reason: StockUpdateReason
    ): Promise<void> {
        try {
            // Ürün bilgisi al
            const product = await this.productRepository.findOne({
                where: { id: productId }
            });

            if (!product) {
                this.logger.warn(`Product not found: ${productId}`);
                return;
            }

            // Set ürün ise, set'in kendisini kuyruğa ekle
            const queueProductId = product.productType === ProductType.SET
                ? product.id
                : productId;

            // Bu ürünün parçası olduğu setleri bul
            const parentSets = await this.findParentSets(queueProductId, storeId);

            // Ana ürünü ve setleri kuyruğa ekle
            const productsToQueue = [queueProductId, ...parentSets];

            for (const pid of productsToQueue) {
                const existing = await this.queueRepository.findOne({
                    where: {
                        productId: pid,
                        storeId,
                        processedAt: IsNull(),
                    }
                });

                if (!existing) {
                    await this.queueRepository.save({
                        productId: pid,
                        storeId,
                        reason,
                        priority: this.calculatePriority(reason),
                        createdAt: new Date(),
                    });
                }
            }

            this.logger.debug(`Enqueued stock update for product ${productId}, store ${storeId}, reason ${reason}`);
        } catch (error) {
            this.logger.error(`Error enqueuing stock update: ${error.message}`, error.stack);
        }
    }

    /**
     * Ürünün parçası olduğu setleri bulur
     */
    private async findParentSets(
        productId: string,
        storeId: string
    ): Promise<string[]> {
        const result = await this.productSetItemRepository
            .createQueryBuilder('psi')
            .innerJoin('psi.setProduct', 'p')
            .innerJoin('p.productStores', 'ps')
            .where('psi.componentProductId = :productId', { productId })
            .andWhere('ps.storeId = :storeId', { storeId })
            .andWhere('p.productType = :setType', { setType: ProductType.SET })
            .select('p.id')
            .getMany();

        return result.map(r => r.setProductId);
    }

    /**
     * Kuyruktaki güncellemeleri işler (Cron job - her 1 dakika)
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async processStockQueue(): Promise<void> {
        try {
            // İşlenmemiş ve TTL geçmemiş kayıtları al
            const cutoffTime = new Date(Date.now() - this.QUEUE_TTL);

            const pendingItems = await this.queueRepository.find({
                where: {
                    processedAt: IsNull(),
                    createdAt: MoreThan(cutoffTime),
                },
                relations: ['product', 'store'],
                order: { priority: 'DESC', createdAt: 'ASC' },
                take: this.BATCH_SIZE,
            });

            if (pendingItems.length === 0) {
                return;
            }

            this.logger.log(`Processing ${pendingItems.length} stock update queue items...`);

            // Store bazında grupla
            const byStore = this.groupByStore(pendingItems);

            for (const [storeId, items] of Object.entries(byStore)) {
                await this.processStoreBatch(storeId, items);
            }
        } catch (error) {
            this.logger.error(`Error processing stock queue: ${error.message}`, error.stack);
        }
    }

    /**
     * Belirli bir mağaza için batch'i işler
     */
    private async processStoreBatch(
        storeId: string,
        items: StockUpdateQueue[]
    ): Promise<void> {
        try {
            const store = await this.storeRepository.findOne({
                where: { id: storeId }
            });

            if (!store) {
                this.logger.warn(`Store not found: ${storeId}`);
                await this.markAsProcessed(items);
                return;
            }

            // Mağaza aktif mi ve stok gönderimi açık mı kontrol et
            if (!store.isActive || !store.sendStock) {
                this.logger.debug(`Store ${store.name} is not active or stock sending is disabled`);
                await this.markAsProcessed(items);
                return;
            }

            // Rate limit kontrolü
            if (!await this.canSendToMarketplace(storeId)) {
                this.logger.debug(`Rate limit reached for store ${storeId}, will retry later`);
                return;
            }

            // Stok verilerini hazırla
            const stockItems = await this.prepareStockItems(items, storeId);

            if (stockItems.length === 0) {
                this.logger.debug(`No valid stock items to send for store ${storeId}`);
                await this.markAsProcessed(items);
                return;
            }

            // Pazaryerine gönder
            await this.sendToMarketplace(store, stockItems);

            // Başarılı, işaretle
            await this.markAsProcessed(items);

            // Rate limit timestamp güncelle
            this.updateLastSentTimestamp(storeId);

        } catch (error) {
            this.logger.error(`Error processing store batch for ${storeId}: ${error.message}`, error.stack);
        }
    }

    /**
     * Stok öğelerini hazırlar (set hesaplaması dahil)
     */
    private async prepareStockItems(
        queueItems: StockUpdateQueue[],
        storeId: string
    ): Promise<StockUpdateItem[]> {
        const items: StockUpdateItem[] = [];
        const processedProductIds = new Set<string>();

        for (const queueItem of queueItems) {
            if (processedProductIds.has(queueItem.productId)) {
                continue;
            }
            processedProductIds.add(queueItem.productId);

            const product = await this.productRepository.findOne({
                where: { id: queueItem.productId }
            });

            if (!product || !product.barcode) continue;

            let quantity = 0;

            if (product.productType === ProductType.SET) {
                quantity = await this.calculateSetStock(queueItem.productId);
            } else {
                quantity = Number(product.sellableQuantity) ?? 0;
            }

            items.push({
                barcode: product.barcode,
                quantity: Math.max(0, Math.min(quantity, 20000)),
            });
        }

        return items;
    }

    /**
     * Set ürün için kullanılabilir set miktarını hesaplar (genel stok – Product)
     */
    async calculateSetStock(setProductId: string): Promise<number> {
        const setItems = await this.productSetItemRepository.find({
            where: { setProductId },
            relations: ['componentProduct']
        });

        if (setItems.length === 0) return 0;

        let minQuantity = Infinity;

        for (const setItem of setItems) {
            const comp = setItem.componentProduct;
            if (!comp) continue;
            const availableQuantity = Number(comp.sellableQuantity) || 0;
            const setsFromComponent = Math.floor(availableQuantity / setItem.quantity);
            minQuantity = Math.min(minQuantity, setsFromComponent);
        }

        return minQuantity === Infinity ? 0 : minQuantity;
    }

    /**
     * Pazaryerine stok güncellemesi gönderir
     */
    private async sendToMarketplace(
        store: Store,
        items: StockUpdateItem[]
    ): Promise<void> {
        const batchId = uuidv4();
        const startTime = Date.now();

        // Ürün detaylarını hazırla
        const productDetails = await this.prepareProductDetails(items, store.id);

        // Log kaydı oluştur - BAŞLANGIÇ
        const logEntry = await this.stockSyncLogRepository.save({
            batchId,
            storeId: store.id,
            provider: this.getProviderFromStoreType(store.type),
            syncStatus: SyncStatus.PROCESSING,
            totalItems: items.length,
            endpoint: this.getEndpointForStore(store),
            method: 'POST',
            requestPayload: JSON.stringify({ items }),
            productDetails,
        });

        try {
            let responseData: any;
            let statusCode: number;

            if (store.type === StoreType.TRENDYOL) {
                const result = await this.sendToTrendyol(store, items);
                responseData = result;
                statusCode = 200;
            } else if (store.type === StoreType.HEPSIBURADA) {
                const result = await this.sendToHepsiburada(store, items);
                responseData = result;
                statusCode = 200;
            } else {
                throw new Error(`Unsupported store type: ${store.type}`);
            }

            const durationMs = Date.now() - startTime;

            // Başarılı log güncelleme - SUCCESS
            await this.stockSyncLogRepository.update(logEntry.id, {
                syncStatus: SyncStatus.SUCCESS,
                successItems: items.length,
                statusCode,
                responsePayload: JSON.stringify(responseData),
                durationMs,
                batchRequestId: responseData.batchRequestId || responseData.id,
            });

            this.logger.log(`✅ Stock sync successful for ${store.name}: ${items.length} items (${durationMs}ms)`);

        } catch (error) {
            const durationMs = Date.now() - startTime;

            // Hata logu - FAILED
            await this.stockSyncLogRepository.update(logEntry.id, {
                syncStatus: SyncStatus.FAILED,
                failedItems: items.length,
                errorMessage: error.message,
                durationMs,
            });

            this.logger.error(`❌ Stock sync failed for ${store.name}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Trendyol'a stok güncellemesi gönderir
     */
    private async sendToTrendyol(
        store: Store,
        items: StockUpdateItem[]
    ): Promise<any> {
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

        if (!response.ok) {
            const errorMsg = responseData.message || JSON.stringify(responseData);
            throw new Error(`Trendyol API error: ${response.status} - ${errorMsg}`);
        }

        return responseData;
    }

    /**
     * Hepsiburada'ya stok güncellemesi gönderir
     */
    private async sendToHepsiburada(
        store: Store,
        items: StockUpdateItem[]
    ): Promise<any> {
        const url = `https://listing-external.hepsiburada.com/listings/merchantid/${store.sellerId}/stock-uploads`;
        const auth = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');

        const stockItems = items.map(item => ({
            barcode: item.barcode,
            quantity: item.quantity
        }));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(stockItems)
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.message || JSON.stringify(responseData);
            throw new Error(`Hepsiburada API error: ${response.status} - ${errorMsg}`);
        }

        return responseData;
    }

    /**
     * Ürün detaylarını hazırla (loglama için)
     */
    private async prepareProductDetails(
        items: StockUpdateItem[],
        storeId: string
    ): Promise<ProductDetail[]> {
        const details: ProductDetail[] = [];

        for (const item of items) {
            const product = await this.productRepository.findOne({
                where: { barcode: item.barcode }
            });

            if (!product) continue;

            details.push({
                barcode: item.barcode,
                productName: product.name,
                oldQuantity: Number(product.sellableQuantity) || 0,
                newQuantity: item.quantity,
                isSetProduct: product.productType === ProductType.SET,
            });
        }

        return details;
    }

    /**
     * Rate limit kontrolü
     */
    private async canSendToMarketplace(storeId: string): Promise<boolean> {
        const lastSent = this.lastSentTimestamps.get(storeId);
        if (!lastSent) return true;

        const elapsed = Date.now() - lastSent.getTime();
        return elapsed >= this.TRENDYOL_RATE_LIMIT_MS;
    }

    private updateLastSentTimestamp(storeId: string): void {
        this.lastSentTimestamps.set(storeId, new Date());
    }

    private calculatePriority(reason: StockUpdateReason): number {
        switch (reason) {
            case StockUpdateReason.ORDER_CREATED: return 100;
            case StockUpdateReason.ORDER_CANCELLED: return 90;
            case StockUpdateReason.STOCK_REMOVED: return 80;
            case StockUpdateReason.STOCK_ADDED: return 70;
            case StockUpdateReason.MANUAL: return 50;
            default: return 50;
        }
    }

    private groupByStore(items: StockUpdateQueue[]): Record<string, StockUpdateQueue[]> {
        return items.reduce((acc, item) => {
            if (!acc[item.storeId]) acc[item.storeId] = [];
            acc[item.storeId].push(item);
            return acc;
        }, {} as Record<string, StockUpdateQueue[]>);
    }

    private async markAsProcessed(items: StockUpdateQueue[]): Promise<void> {
        await this.queueRepository.update(
            items.map(i => i.id),
            { processedAt: new Date() }
        );
    }

    private getProviderFromStoreType(storeType: StoreType): ApiLogProvider {
        switch (storeType) {
            case StoreType.TRENDYOL: return ApiLogProvider.TRENDYOL;
            case StoreType.HEPSIBURADA: return ApiLogProvider.HEPSIBURADA;
            case StoreType.IKAS: return ApiLogProvider.IKAS;
            default: return ApiLogProvider.TRENDYOL;
        }
    }

    private getEndpointForStore(store: Store): string {
        if (store.type === StoreType.TRENDYOL) {
            return `https://apigw.trendyol.com/integration/inventory/sellers/${store.sellerId}/products/price-and-inventory`;
        } else if (store.type === StoreType.HEPSIBURADA) {
            return `https://listing-external.hepsiburada.com/listings/merchantid/${store.sellerId}/stock-uploads`;
        }
        return '';
    }

    // ==================== PUBLIC API METHODS ====================

    /**
     * GET /stock-sync/logs
     * Stok senkronizasyon loglarını listele
     */
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

    /**
     * GET /stock-sync/logs/:id
     * Log detayını getir
     */
    async getLogDetail(id: string): Promise<StockSyncLog | null> {
        return this.stockSyncLogRepository.findOne({
            where: { id },
            relations: ['store'],
        });
    }

    /**
     * GET /stock-sync/stats
     * İstatistikler
     */
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

        const durations = logs.filter(l => l.durationMs != null).map(l => l.durationMs!);
        const avgDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;

        const totalItems = logs.reduce((sum, l) => sum + l.totalItems, 0);

        // Provider bazında istatistik
        const byProvider: Record<string, any> = {};
        for (const provider of Object.values(ApiLogProvider)) {
            const providerLogs = logs.filter(l => l.provider === provider);
            if (providerLogs.length > 0) {
                const providerDurations = providerLogs.filter(l => l.durationMs != null).map(l => l.durationMs!);
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

    /**
     * GET /stock-sync/queue-status
     * Kuyruk durumu
     */
    async getQueueStatus(): Promise<{
        pending: number;
        oldestPending: Date | null;
        byStore: Record<string, number>;
    }> {
        const pendingItems = await this.queueRepository.find({
            where: { processedAt: IsNull() },
            relations: ['store'],
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

    /**
     * POST /stock-sync/retry/:id
     * Başarısız logu tekrar dene
     */
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
        const requestData = JSON.parse(log.requestPayload || '{}');
        const items = requestData.items || [];

        if (items.length === 0) {
            return { success: false, message: 'Yeniden denenecek ürün bulunamadı' };
        }

        // Tekrar dene
        try {
            await this.sendToMarketplace(log.store, items);
            return { success: true, message: 'Stok senkronizasyonu başarıyla tekrarlandı' };
        } catch (error) {
            return { success: false, message: `Hata: ${error.message}` };
        }
    }
}
