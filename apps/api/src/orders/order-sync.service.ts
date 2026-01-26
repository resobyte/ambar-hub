import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import axios from 'axios';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { Store, StoreType } from '../stores/entities/store.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { Route } from '../routes/entities/route.entity';
import { RouteStatus } from '../routes/enums/route-status.enum';
import { OrderHistoryService } from './order-history.service';
import { OrderHistoryAction } from './entities/order-history.entity';
import { OrdersService } from './orders.service';

/**
 * Order Sync Service
 * 
 * 1. Her 10 dakikada bir: Pazaryerlerinden yeni siparişleri çek ve iptal edilenleri güncelle
 * 2. Her 15 dakikada bir: Paketlendi/Faturalandı/Kargoya Verildi siparişlerin durumlarını güncelle
 */
@Injectable()
export class OrderSyncService {
    private readonly logger = new Logger(OrderSyncService.name);
    private isSyncingNewOrders = false;
    private isUpdatingStatuses = false;

    constructor(
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,
        @InjectRepository(RouteOrder)
        private readonly routeOrderRepository: Repository<RouteOrder>,
        @InjectRepository(Route)
        private readonly routeRepository: Repository<Route>,
        private readonly orderHistoryService: OrderHistoryService,
        @Inject(forwardRef(() => OrdersService))
        private readonly ordersService: OrdersService,
    ) {}

    // ─────────────────────────────────────────────────────────────
    // JOB 1: Yeni siparişleri çek ve iptal edilenleri güncelle (10 dk)
    // ─────────────────────────────────────────────────────────────
    @Cron('0 */10 * * * *') // Her 10 dakikada bir
    async syncNewOrdersJob(): Promise<void> {
        if (this.isSyncingNewOrders) {
            this.logger.warn('Previous order sync job still running, skipping...');
            return;
        }

        this.isSyncingNewOrders = true;
        this.logger.log('Starting order sync job (CREATED & CANCELLED)...');

        try {
            const stores = await this.storeRepository.find({
                where: { 
                    isActive: true,
                    type: In([StoreType.TRENDYOL, StoreType.HEPSIBURADA, StoreType.IKAS]),
                },
            });

            for (const store of stores) {
                try {
                    await this.syncStoreOrders(store);
                } catch (error: any) {
                    this.logger.error(`Failed to sync orders for store ${store.name}: ${error.message}`);
                }
            }

            this.logger.log('Order sync job completed');
        } catch (error: any) {
            this.logger.error(`Order sync job failed: ${error.message}`);
        } finally {
            this.isSyncingNewOrders = false;
        }
    }

    private async syncStoreOrders(store: Store): Promise<void> {
        // 1. Yeni siparişleri çek (mevcut syncOrders metodunu kullan)
        this.logger.log(`[${store.name}] Syncing new orders...`);
        try {
            await this.ordersService.syncOrders(store.id);
        } catch (error: any) {
            this.logger.error(`[${store.name}] Failed to sync new orders: ${error.message}`);
        }

        // 2. İptal edilen siparişleri kontrol et
        this.logger.log(`[${store.name}] Checking cancelled orders...`);
        switch (store.type) {
            case StoreType.TRENDYOL:
                await this.syncTrendyolCancelled(store);
                break;
            case StoreType.HEPSIBURADA:
                await this.syncHepsiburadaCancelled(store);
                break;
            case StoreType.IKAS:
                await this.syncIkasCancelled(store);
                break;
        }
    }

    private async syncTrendyolCancelled(store: Store): Promise<void> {
        const auth = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');
        const baseUrl = `https://apigw.trendyol.com/integration/order/sellers/${store.sellerId}/orders`;

        // Son 7 gün içindeki iptal siparişlerini çek
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        let page = 0;
        let totalPages = 1;
        let cancelledCount = 0;

        do {
            try {
                const params = new URLSearchParams({
                    page: page.toString(),
                    size: '200',
                    status: 'Cancelled',
                    orderByField: 'PackageLastModifiedDate',
                    orderByDirection: 'DESC',
                });

                const response = await fetch(`${baseUrl}?${params}`, {
                    headers: { Authorization: `Basic ${auth}` },
                });

                if (!response.ok) {
                    this.logger.error(`Trendyol API error: ${response.statusText}`);
                    break;
                }

                const data: any = await response.json();
                totalPages = data.totalPages || 1;

                for (const pkg of data.content || []) {
                    const updated = await this.handleCancelledOrder(pkg.orderNumber, store.id, 'Trendyol');
                    if (updated) cancelledCount++;
                }

                page++;
            } catch (error: any) {
                this.logger.error(`Trendyol cancelled sync error: ${error.message}`);
                break;
            }
        } while (page < totalPages && page < 5); // Max 5 sayfa

        if (cancelledCount > 0) {
            this.logger.log(`[${store.name}] ${cancelledCount} orders marked as cancelled`);
        }
    }

    private async syncHepsiburadaCancelled(store: Store): Promise<void> {
        const auth = Buffer.from(`${store.sellerId}:${store.apiSecret}`).toString('base64');
        let cancelledCount = 0;

        try {
            const cancelledUrl = `https://oms-external.hepsiburada.com/orders/merchantid/${store.sellerId}/cancelled`;
            
            const response = await axios.get(cancelledUrl, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'User-Agent': 'hamurlabs_dev',
                    'Accept': 'application/json',
                },
                params: { limit: 200, offset: 0 },
            });

            const orders = response.data?.data?.orders || response.data || [];

            for (const order of orders) {
                const orderNumber = order.orderNumber || order.OrderNumber;
                if (orderNumber) {
                    const updated = await this.handleCancelledOrder(orderNumber, store.id, 'Hepsiburada');
                    if (updated) cancelledCount++;
                }
            }

            if (cancelledCount > 0) {
                this.logger.log(`[${store.name}] ${cancelledCount} orders marked as cancelled`);
            }
        } catch (error: any) {
            this.logger.error(`Hepsiburada cancelled sync error: ${error.message}`);
        }
    }

    private async syncIkasCancelled(store: Store): Promise<void> {
        let cancelledCount = 0;

        try {
            const tokenResponse = await axios.post(
                `https://${store.sellerId}.myikas.com/api/admin/oauth/token`,
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: store.apiKey,
                    client_secret: store.apiSecret,
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const accessToken = tokenResponse.data?.access_token;
            if (!accessToken) return;

            const query = `
                query {
                    listOrder(
                        pagination: { page: 1, limit: 200 }
                        orderStatuses: [CANCELLED]
                    ) {
                        data {
                            id
                            orderNumber
                            status
                        }
                    }
                }
            `;

            const response = await axios.post(
                `https://${store.sellerId}.myikas.com/api/admin/graphql`,
                { query },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const orders = response.data?.data?.listOrder?.data || [];

            for (const order of orders) {
                if (order.orderNumber) {
                    const updated = await this.handleCancelledOrder(order.orderNumber, store.id, 'ikas');
                    if (updated) cancelledCount++;
                }
            }

            if (cancelledCount > 0) {
                this.logger.log(`[${store.name}] ${cancelledCount} orders marked as cancelled`);
            }
        } catch (error: any) {
            this.logger.error(`ikas cancelled sync error: ${error.message}`);
        }
    }

    private async handleCancelledOrder(orderNumber: string, storeId: string, source: string): Promise<boolean> {
        const order = await this.orderRepository.findOne({
            where: { orderNumber, storeId },
        });

        if (!order) return false;

        // Zaten iptal edilmişse skip
        if (order.status === OrderStatus.CANCELLED) return false;

        const previousStatus = order.status;

        // Rotadan çıkar
        const routeOrder = await this.routeOrderRepository.findOne({
            where: { orderId: order.id },
            relations: ['route'],
        });

        if (routeOrder && routeOrder.route) {
            // Aktif rotadaysa çıkar
            if (routeOrder.route.status !== RouteStatus.COMPLETED && 
                routeOrder.route.status !== RouteStatus.CANCELLED) {
                
                await this.routeOrderRepository.remove(routeOrder);
                
                // Rota sayılarını güncelle
                routeOrder.route.totalOrderCount = Math.max(0, routeOrder.route.totalOrderCount - 1);
                await this.routeRepository.save(routeOrder.route);
                
                this.logger.log(`Order ${orderNumber} removed from route ${routeOrder.route.name} due to cancellation`);
            }
        }

        // Siparişi iptal et
        order.status = OrderStatus.CANCELLED;
        order.integrationStatus = 'Cancelled';
        await this.orderRepository.save(order);

        // History log
        await this.orderHistoryService.logEvent({
            orderId: order.id,
            action: OrderHistoryAction.STATUS_CHANGED,
            previousStatus,
            newStatus: OrderStatus.CANCELLED,
            description: `Sipariş ${source} tarafından iptal edildi`,
        });

        this.logger.log(`Order ${orderNumber} cancelled from ${source}`);
        return true;
    }

    // ─────────────────────────────────────────────────────────────
    // JOB 2: Gönderilmiş siparişlerin durumlarını güncelle (15 dk)
    // ─────────────────────────────────────────────────────────────
    @Cron('0 */15 * * * *') // Her 15 dakikada bir
    async updateShippedOrdersStatusJob(): Promise<void> {
        if (this.isUpdatingStatuses) {
            this.logger.warn('Previous status update job still running, skipping...');
            return;
        }

        this.isUpdatingStatuses = true;
        this.logger.log('Starting shipped orders status update job...');

        try {
            // MANUEL harici, Paketlendi/Faturalandı/Kargoya Verildi siparişleri bul
            const ordersToCheck = await this.orderRepository.find({
                where: {
                    status: In([
                        OrderStatus.PACKED,
                        OrderStatus.INVOICED,
                        OrderStatus.SHIPPED,
                    ]),
                },
                relations: ['store'],
            });

            // MANUEL mağazaları filtrele
            const marketplaceOrders = ordersToCheck.filter(
                o => o.store && o.store.type !== StoreType.MANUAL
            );

            if (marketplaceOrders.length === 0) {
                this.logger.debug('No marketplace orders to update');
                return;
            }

            this.logger.log(`Checking status for ${marketplaceOrders.length} orders...`);

            // Mağazalara göre grupla
            const ordersByStore = new Map<string, Order[]>();
            for (const order of marketplaceOrders) {
                const storeId = order.storeId;
                if (!ordersByStore.has(storeId)) {
                    ordersByStore.set(storeId, []);
                }
                ordersByStore.get(storeId)!.push(order);
            }

            // Her mağaza için bulk sorgula
            for (const [storeId, orders] of ordersByStore) {
                const store = orders[0].store;
                if (!store) continue;

                try {
                    switch (store.type) {
                        case StoreType.TRENDYOL:
                            await this.bulkCheckTrendyolStatus(store, orders);
                            break;
                        case StoreType.HEPSIBURADA:
                            await this.bulkCheckHepsiburadaStatus(store, orders);
                            break;
                        case StoreType.IKAS:
                            await this.bulkCheckIkasStatus(store, orders);
                            break;
                    }
                } catch (error: any) {
                    this.logger.error(`Failed to check status for store ${store.name}: ${error.message}`);
                }
            }

            this.logger.log('Shipped orders status update completed');
        } catch (error: any) {
            this.logger.error(`Status update job failed: ${error.message}`);
        } finally {
            this.isUpdatingStatuses = false;
        }
    }

    private async bulkCheckTrendyolStatus(store: Store, orders: Order[]): Promise<void> {
        const auth = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');
        const baseUrl = `https://apigw.trendyol.com/integration/order/sellers/${store.sellerId}/orders`;

        // Her sipariş için tek tek sorgula (bulk API yok)
        for (const order of orders) {
            try {
                const params = new URLSearchParams({
                    orderNumber: order.orderNumber,
                    size: '1',
                });

                const response = await fetch(`${baseUrl}?${params}`, {
                    headers: { Authorization: `Basic ${auth}` },
                });

                if (!response.ok) continue;

                const data: any = await response.json();
                const pkg = data.content?.[0];

                if (pkg) {
                    const newStatus = this.mapTrendyolStatus(pkg.status);
                    if (newStatus && newStatus !== order.status) {
                        await this.updateOrderStatus(order, newStatus, pkg.status);
                    }
                }
            } catch (error: any) {
                this.logger.error(`Failed to check Trendyol order ${order.orderNumber}: ${error.message}`);
            }
        }
    }

    private async bulkCheckHepsiburadaStatus(store: Store, orders: Order[]): Promise<void> {
        const auth = Buffer.from(`${store.sellerId}:${store.apiSecret}`).toString('base64');

        // Durum endpoint'lerini kontrol et
        const statusEndpoints = [
            { url: `https://oms-external.hepsiburada.com/packages/merchantid/${store.sellerId}/shipped`, status: OrderStatus.SHIPPED },
            { url: `https://oms-external.hepsiburada.com/packages/merchantid/${store.sellerId}/delivered`, status: OrderStatus.DELIVERED },
            { url: `https://oms-external.hepsiburada.com/orders/merchantid/${store.sellerId}/cancelled`, status: OrderStatus.CANCELLED },
        ];

        const orderNumbers = new Set(orders.map(o => o.orderNumber));
        const updatedOrders = new Set<string>();

        for (const endpoint of statusEndpoints) {
            try {
                const response = await axios.get(endpoint.url, {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'User-Agent': 'hamurlabs_dev',
                        'Accept': 'application/json',
                    },
                    params: { limit: 500, offset: 0 },
                });

                const items = response.data?.data?.orders || response.data?.data?.packages || response.data || [];

                for (const item of items) {
                    const orderNumber = item.orderNumber || item.OrderNumber;
                    if (orderNumber && orderNumbers.has(orderNumber) && !updatedOrders.has(orderNumber)) {
                        const order = orders.find(o => o.orderNumber === orderNumber);
                        if (order && order.status !== endpoint.status) {
                            await this.updateOrderStatus(order, endpoint.status, endpoint.status);
                            updatedOrders.add(orderNumber);
                        }
                    }
                }
            } catch (error: any) {
                this.logger.error(`Hepsiburada status check error: ${error.message}`);
            }
        }
    }

    private async bulkCheckIkasStatus(store: Store, orders: Order[]): Promise<void> {
        try {
            const tokenResponse = await axios.post(
                `https://${store.sellerId}.myikas.com/api/admin/oauth/token`,
                new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: store.apiKey,
                    client_secret: store.apiSecret,
                }),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            const accessToken = tokenResponse.data?.access_token;
            if (!accessToken) return;

            // Her sipariş için sorgula
            for (const order of orders) {
                try {
                    const query = `
                        query {
                            listOrder(
                                search: { searchKey: "${order.orderNumber}" }
                                pagination: { page: 1, limit: 1 }
                            ) {
                                data {
                                    orderNumber
                                    status
                                }
                            }
                        }
                    `;

                    const response = await axios.post(
                        `https://${store.sellerId}.myikas.com/api/admin/graphql`,
                        { query },
                        {
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    const orderData = response.data?.data?.listOrder?.data?.[0];
                    if (orderData) {
                        const newStatus = this.mapIkasStatus(orderData.status);
                        if (newStatus && newStatus !== order.status) {
                            await this.updateOrderStatus(order, newStatus, orderData.status);
                        }
                    }
                } catch (error: any) {
                    this.logger.error(`Failed to check ikas order ${order.orderNumber}: ${error.message}`);
                }
            }
        } catch (error: any) {
            this.logger.error(`ikas status check error: ${error.message}`);
        }
    }

    private async updateOrderStatus(order: Order, newStatus: OrderStatus, integrationStatus: string): Promise<void> {
        const previousStatus = order.status;

        order.status = newStatus;
        order.integrationStatus = integrationStatus;
        await this.orderRepository.save(order);

        await this.orderHistoryService.logEvent({
            orderId: order.id,
            action: OrderHistoryAction.STATUS_CHANGED,
            previousStatus,
            newStatus,
            description: `Sipariş durumu ${integrationStatus} olarak güncellendi`,
        });

        this.logger.log(`Order ${order.orderNumber} status updated: ${previousStatus} -> ${newStatus}`);
    }

    private mapTrendyolStatus(status: string): OrderStatus | null {
        const statusMap: Record<string, OrderStatus> = {
            'Created': OrderStatus.CREATED,
            'Picking': OrderStatus.PICKING,
            'Packed': OrderStatus.PACKED,
            'Invoiced': OrderStatus.INVOICED,
            'Shipped': OrderStatus.SHIPPED,
            'Delivered': OrderStatus.DELIVERED,
            'Cancelled': OrderStatus.CANCELLED,
            'UnDelivered': OrderStatus.UNDELIVERED,
            'UnSupplied': OrderStatus.UNSUPPLIED,
            'Returned': OrderStatus.RETURNED,
        };
        return statusMap[status] || null;
    }

    private mapIkasStatus(status: string): OrderStatus | null {
        const statusMap: Record<string, OrderStatus> = {
            'CREATED': OrderStatus.CREATED,
            'APPROVED': OrderStatus.WAITING_PICKING,
            'PREPARING': OrderStatus.PICKING,
            'READY_FOR_SHIPMENT': OrderStatus.PACKED,
            'SHIPPED': OrderStatus.SHIPPED,
            'DELIVERED': OrderStatus.DELIVERED,
            'CANCELLED': OrderStatus.CANCELLED,
            'RETURNED': OrderStatus.RETURNED,
        };
        return statusMap[status] || null;
    }
}
