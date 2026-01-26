import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackingSession } from './entities/packing-session.entity';
import { PackingOrderItem } from './entities/packing-order-item.entity';
import { PackingSessionStatus } from './enums/packing-session-status.enum';
import { Route } from '../routes/entities/route.entity';
import { RouteOrder } from '../routes/entities/route-order.entity';
import { RouteStatus } from '../routes/enums/route-status.enum';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { OrderConsumable } from '../orders/entities/order-consumable.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { Consumable } from '../consumables/entities/consumable.entity';
import { Store, StoreType } from '../stores/entities/store.entity';
import { StartPackingDto, ScanBarcodeDto, CompleteOrderDto } from './dto/packing.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { ArasKargoService } from '../stores/providers/aras-kargo.service';
import { WaybillsService } from '../waybills/waybills.service';
import { ShelvesService } from '../shelves/shelves.service';
import { MovementType } from '../shelves/entities/shelf-stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStore } from '../product-stores/entities/product-store.entity';
import { OrderHistoryService } from '../orders/order-history.service';
import { OrderHistoryAction } from '../orders/entities/order-history.entity';
import { OrderApiLogService } from '../orders/order-api-log.service';
import { ApiLogProvider, ApiLogType } from '../orders/entities/order-api-log.entity';

export interface ShipmentResult {
    success: boolean;
    message: string;
    invoiceNumber?: string;
    invoiceId?: string;
    cargoLabel?: { zpl?: string; html: string; labelType: 'aras' | 'dummy' };
    waybillNumber?: string;
}

@Injectable()
export class PackingService {
    private readonly logger = new Logger(PackingService.name);

    constructor(
        @InjectRepository(PackingSession)
        private readonly sessionRepository: Repository<PackingSession>,
        @InjectRepository(PackingOrderItem)
        private readonly packingItemRepository: Repository<PackingOrderItem>,
        @InjectRepository(Route)
        private readonly routeRepository: Repository<Route>,
        @InjectRepository(RouteOrder)
        private readonly routeOrderRepository: Repository<RouteOrder>,
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(OrderItem)
        private readonly orderItemRepository: Repository<OrderItem>,
        @InjectRepository(OrderConsumable)
        private readonly orderConsumableRepository: Repository<OrderConsumable>,
        @InjectRepository(Consumable)
        private readonly consumableRepository: Repository<Consumable>,
        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(ProductStore)
        private readonly productStoreRepository: Repository<ProductStore>,
        @Inject(forwardRef(() => InvoicesService))
        private readonly invoicesService: InvoicesService,
        private readonly arasKargoService: ArasKargoService,
        @Inject(forwardRef(() => WaybillsService))
        private readonly waybillsService: WaybillsService,
        private readonly shelvesService: ShelvesService,
        @Inject(forwardRef(() => OrderHistoryService))
        private readonly orderHistoryService: OrderHistoryService,
        @Inject(forwardRef(() => OrderApiLogService))
        private readonly orderApiLogService: OrderApiLogService,
    ) { }

    async startSession(dto: StartPackingDto, userId?: string): Promise<PackingSession> {
        const route = await this.routeRepository.findOne({
            where: { id: dto.routeId },
            relations: ['routeOrders', 'routeOrders.order', 'routeOrders.order.items'],
        });

        if (!route) {
            throw new NotFoundException('Route not found');
        }

        if (route.status !== RouteStatus.READY && route.status !== RouteStatus.COLLECTING) {
            throw new BadRequestException('Route is not ready for packing');
        }

        const existingSession = await this.sessionRepository.findOne({
            where: {
                routeId: dto.routeId,
                status: PackingSessionStatus.ACTIVE,
            },
        });

        if (existingSession) {
            return this.getSession(existingSession.id);
        }

        const session = this.sessionRepository.create({
            routeId: dto.routeId,
            userId: userId || null,
            stationId: dto.stationId || null,
            status: PackingSessionStatus.ACTIVE,
            totalOrders: route.routeOrders?.length || 0,
            packedOrders: 0,
        });

        const savedSession = await this.sessionRepository.save(session);

        const packingItems: PackingOrderItem[] = [];
        let sequence = 0;

        for (const routeOrder of route.routeOrders || []) {
            if (routeOrder.isPacked) continue;

            const order = routeOrder.order;
            if (!order || !order.items) continue;

            for (const item of order.items) {
                packingItems.push(this.packingItemRepository.create({
                    sessionId: savedSession.id,
                    orderId: order.id,
                    barcode: item.barcode,
                    productId: null,
                    requiredQuantity: item.quantity || 1,
                    scannedQuantity: 0,
                    isComplete: false,
                    sequence: sequence++,
                }));
            }
        }

        if (packingItems.length > 0) {
            await this.packingItemRepository.save(packingItems);
        }

        const firstUnpackedOrder = route.routeOrders?.find(ro => !ro.isPacked);
        if (firstUnpackedOrder) {
            savedSession.currentOrderId = firstUnpackedOrder.orderId;
            await this.sessionRepository.save(savedSession);

            // Update order status to PACKING
            const order = firstUnpackedOrder.order;
            const previousStatus = order?.status;
            await this.orderRepository.update(firstUnpackedOrder.orderId, { status: OrderStatus.PACKING });

            await this.orderHistoryService.logEvent({
                orderId: firstUnpackedOrder.orderId,
                action: OrderHistoryAction.PACKING_STARTED,
                userId,
                routeId: route.id,
                routeName: route.name,
                sessionId: savedSession.id,
                previousStatus,
                newStatus: OrderStatus.PACKING,
                description: `Paketleme başladı - Rota: ${route.name}`,
            });
        }

        return this.getSession(savedSession.id);
    }

    async getSession(id: string): Promise<PackingSession> {
        const session = await this.sessionRepository.findOne({
            where: { id },
            relations: ['route', 'route.routeConsumables', 'route.routeConsumables.consumable', 'items', 'items.order', 'items.order.customer', 'items.order.items'],
        });

        if (!session) {
            throw new NotFoundException('Packing session not found');
        }

        return session;
    }

    async findOrderByProductBarcode(sessionId: string, barcode: string): Promise<{
        success: boolean;
        message: string;
        order?: Order;
        item?: PackingOrderItem;
        allItemsForOrder?: PackingOrderItem[];
    }> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['items', 'items.order', 'items.order.customer', 'items.order.items'],
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        if (session.status !== PackingSessionStatus.ACTIVE) {
            throw new BadRequestException('Session is not active');
        }

        const matchingItem = session.items.find(
            item => item.barcode === barcode && !item.isComplete
        );

        if (!matchingItem) {
            const completedItem = session.items.find(item => item.barcode === barcode);
            if (completedItem) {
                return {
                    success: false,
                    message: 'Bu ürün zaten tarandı',
                };
            }

            return {
                success: false,
                message: `Barkod bu rotada bulunamadı: ${barcode}`,
            };
        }

        const order = await this.orderRepository.findOne({
            where: { id: matchingItem.orderId },
            relations: ['customer', 'items', 'store'],
        });

        if (!order) {
            return {
                success: false,
                message: 'Sipariş bulunamadı',
            };
        }

        const allItemsForOrder = session.items.filter(
            item => item.orderId === matchingItem.orderId
        );

        return {
            success: true,
            message: 'Sipariş bulundu',
            order,
            item: matchingItem,
            allItemsForOrder,
        };
    }

    async confirmProductScan(sessionId: string, barcode: string, orderId: string): Promise<{
        success: boolean;
        message: string;
        item?: PackingOrderItem;
        orderComplete?: boolean;
        allItemsForOrder?: PackingOrderItem[];
    }> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
            relations: ['items'],
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        const matchingItem = session.items.find(
            item => item.barcode === barcode && item.orderId === orderId && !item.isComplete
        );

        if (!matchingItem) {
            return {
                success: false,
                message: 'Ürün bulunamadı veya zaten tarandı',
            };
        }

        matchingItem.scannedQuantity += 1;
        matchingItem.scannedAt = new Date();

        if (matchingItem.scannedQuantity >= matchingItem.requiredQuantity) {
            matchingItem.isComplete = true;
        }

        await this.packingItemRepository.save(matchingItem);

        await this.transferToPackingShelf(
            barcode,
            1,
            orderId,
            session.routeId,
        );

        const allItemsForOrder = await this.packingItemRepository.find({
            where: { sessionId, orderId },
        });

        const orderComplete = allItemsForOrder.every(item => item.isComplete);

        return {
            success: true,
            message: orderComplete
                ? 'Sipariş tamamlandı!'
                : `Ürün onaylandı (${matchingItem.scannedQuantity}/${matchingItem.requiredQuantity})`,
            item: matchingItem,
            orderComplete,
            allItemsForOrder,
        };
    }

    async scanBarcode(dto: ScanBarcodeDto): Promise<{
        success: boolean;
        message: string;
        item?: PackingOrderItem;
        orderComplete?: boolean;
        nextOrderId?: string;
    }> {
        const session = await this.sessionRepository.findOne({
            where: { id: dto.sessionId },
            relations: ['items'],
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        if (session.status !== PackingSessionStatus.ACTIVE) {
            throw new BadRequestException('Session is not active');
        }

        const currentOrderItems = session.items.filter(
            item => item.orderId === session.currentOrderId && !item.isComplete
        );

        const matchingItem = currentOrderItems.find(item => item.barcode === dto.barcode);

        if (!matchingItem) {
            const anyMatchingItem = session.items.find(item => item.barcode === dto.barcode && !item.isComplete);

            if (anyMatchingItem) {
                return {
                    success: false,
                    message: `Bu barkod mevcut siparişe ait değil. Önce mevcut siparişi tamamlayın.`,
                };
            }

            return {
                success: false,
                message: `Barkod bulunamadı: ${dto.barcode}`,
            };
        }

        matchingItem.scannedQuantity += 1;
        matchingItem.scannedAt = new Date();

        if (matchingItem.scannedQuantity >= matchingItem.requiredQuantity) {
            matchingItem.isComplete = true;
        }

        await this.packingItemRepository.save(matchingItem);

        await this.transferToPackingShelf(
            dto.barcode,
            1,
            session.currentOrderId!,
            session.routeId,
        );

        const remainingItems = await this.packingItemRepository.find({
            where: {
                sessionId: dto.sessionId,
                orderId: session.currentOrderId!,
                isComplete: false,
            },
        });

        const orderComplete = remainingItems.length === 0;

        return {
            success: true,
            message: orderComplete
                ? 'Sipariş tamamlandı! Paketlemeye geçebilirsiniz.'
                : `Ürün okutuldu (${matchingItem.scannedQuantity}/${matchingItem.requiredQuantity})`,
            item: matchingItem,
            orderComplete,
        };
    }

    async completeOrder(dto: CompleteOrderDto): Promise<{
        success: boolean;
        message: string;
        sessionComplete?: boolean;
        nextOrderId?: string;
        data?: any;
    }> {
        const session = await this.sessionRepository.findOne({
            where: { id: dto.sessionId },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        if (dto.consumables && dto.consumables.length > 0) {
            for (const consumableDto of dto.consumables) {
                const consumable = await this.consumableRepository.findOne({
                    where: { id: consumableDto.consumableId }
                });

                if (!consumable) {
                    this.logger.warn(`Consumable ${consumableDto.consumableId} not found, skipping`);
                    continue;
                }

                const orderConsumable = this.orderConsumableRepository.create({
                    orderId: dto.orderId,
                    consumableId: consumableDto.consumableId,
                    quantity: consumableDto.quantity,
                    unitCost: Number(consumable.averageCost) || 0,
                    packingSessionId: dto.sessionId,
                });
                await this.orderConsumableRepository.save(orderConsumable);

                const currentStock = Number(consumable.stockQuantity) || 0;
                const deductAmount = Math.min(consumableDto.quantity, currentStock);
                if (deductAmount > 0) {
                    consumable.stockQuantity = currentStock - deductAmount;
                    await this.consumableRepository.save(consumable);
                }
            }
        }

        await this.deductFromPackingShelf(dto.orderId, session.routeId);
        await this.releaseStockCommitment(dto.orderId);

        await this.routeOrderRepository.update(
            { routeId: session.routeId, orderId: dto.orderId },
            { isPacked: true, packedAt: new Date() }
        );

        await this.orderRepository.update(dto.orderId, { status: OrderStatus.PACKED });

        const route = await this.routeRepository.findOne({ where: { id: session.routeId } });

        await this.orderHistoryService.logEvent({
            orderId: dto.orderId,
            action: OrderHistoryAction.PACKING_COMPLETED,
            userId: session.userId,
            routeId: session.routeId,
            routeName: route?.name,
            sessionId: dto.sessionId,
            description: `Paketleme tamamlandı - Rota: ${route?.name}`,
        });

        let shouldProcessShipment = dto.processShipment === true;

        if (!shouldProcessShipment && dto.processShipment !== false) {
            const order = await this.orderRepository.findOne({
                where: { id: dto.orderId },
                relations: ['store'],
            });

            if (order?.store && order.store.type !== StoreType.MANUAL) {
                if (order.store.sendOrderStatus) {
                    shouldProcessShipment = true;
                    this.logger.log(`Auto-processing shipment for marketplace order ${dto.orderId} (sendOrderStatus enabled)`);
                }
            } else if (order?.store?.type === StoreType.MANUAL) {
                shouldProcessShipment = true;
                this.logger.log(`Auto-processing shipment for manual order ${dto.orderId}`);
            }
        }

        let shipmentResult: ShipmentResult | undefined;
        if (shouldProcessShipment) {
            shipmentResult = await this.processOrderShipment(dto.orderId);

            if (shipmentResult.success) {
                await this.orderHistoryService.logEvent({
                    orderId: dto.orderId,
                    action: OrderHistoryAction.SHIPPED,
                    userId: session.userId,
                    previousStatus: OrderStatus.PACKED,
                    newStatus: OrderStatus.SHIPPED,
                    description: `Kargoya verildi${shipmentResult.invoiceNumber ? ` - Fatura: ${shipmentResult.invoiceNumber}` : ''}`,
                    metadata: {
                        invoiceNumber: shipmentResult.invoiceNumber,
                        waybillNumber: shipmentResult.waybillNumber,
                    },
                });
            }
        }

        session.packedOrders += 1;

        const nextRouteOrder = await this.routeOrderRepository.findOne({
            where: {
                routeId: session.routeId,
                isPacked: false,
            },
            order: { sequence: 'ASC' },
        });

        if (nextRouteOrder) {
            session.currentOrderId = nextRouteOrder.orderId;
            await this.sessionRepository.save(session);

            // Update next order status to PACKING
            await this.orderRepository.update(nextRouteOrder.orderId, { status: OrderStatus.PACKING });

            await this.orderHistoryService.logEvent({
                orderId: nextRouteOrder.orderId,
                action: OrderHistoryAction.PACKING_STARTED,
                userId: session.userId,
                routeId: session.routeId,
                routeName: route?.name,
                sessionId: dto.sessionId,
                previousStatus: OrderStatus.PICKED,
                newStatus: OrderStatus.PACKING,
                description: `Paketleme başladı - Rota: ${route?.name}`,
            });

            return {
                success: true,
                message: shipmentResult?.success
                    ? 'Sipariş paketlendi ve kargoya hazırlandı. Sonraki siparişe geçiliyor.'
                    : 'Sipariş paketlendi. Sonraki siparişe geçiliyor.',
                sessionComplete: false,
                nextOrderId: nextRouteOrder.orderId,
                data: shipmentResult,
            };
        } else {
            session.status = PackingSessionStatus.COMPLETED;
            session.completedAt = new Date();
            session.currentOrderId = null;
            await this.sessionRepository.save(session);

            await this.routeRepository.update(session.routeId, {
                status: RouteStatus.COMPLETED
            });

            return {
                success: true,
                message: 'Tüm siparişler paketlendi! Rota tamamlandı.',
                sessionComplete: true,
                data: shipmentResult,
            };
        }
    }

    async getCurrentOrder(sessionId: string): Promise<any> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
        });

        if (!session || !session.currentOrderId) {
            return null;
        }

        const order = await this.orderRepository.findOne({
            where: { id: session.currentOrderId },
            relations: ['items', 'customer'],
        });

        if (!order) return null;

        const packingItems = await this.packingItemRepository.find({
            where: {
                sessionId,
                orderId: session.currentOrderId,
            },
            order: { sequence: 'ASC' },
        });

        return {
            order,
            packingItems,
            allItemsScanned: packingItems.every(item => item.isComplete),
        };
    }

    async cancelSession(sessionId: string): Promise<void> {
        const session = await this.sessionRepository.findOne({
            where: { id: sessionId },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        session.status = PackingSessionStatus.CANCELLED;
        session.completedAt = new Date();
        await this.sessionRepository.save(session);
    }

    async processOrderShipment(orderId: string): Promise<ShipmentResult> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: ['items', 'customer', 'store'],
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const result: ShipmentResult = {
            success: false,
            message: '',
        };

        try {
            const store = order.store;
            const isMarketplaceOrder = store && store.type !== StoreType.MANUAL;

            if (isMarketplaceOrder && store) {
                await this.processMarketplaceShipment(order, store, result);
            } else {
                await this.processManualShipment(order, result);
            }

            result.success = true;
            result.message = 'Sipariş başarıyla işlendi.';

        } catch (error) {
            this.logger.error(`Error processing shipment for order ${orderId}`, error);
            result.success = false;
            result.message = `Hata: ${error.message}`;
        }

        return result;
    }

    private async processMarketplaceShipment(
        order: Order,
        store: Store,
        result: ShipmentResult,
    ): Promise<void> {
        this.logger.log(`Processing marketplace shipment for order ${order.orderNumber} (${store.type})`);

        const shouldSendStatus = store.sendOrderStatus !== false;

        if (store.type === StoreType.TRENDYOL && shouldSendStatus) {
            try {
                await this.updateTrendyolStatus(order, store, 'Picking');

                await this.orderHistoryService.logEvent({
                    orderId: order.id,
                    action: OrderHistoryAction.INTEGRATION_STATUS_PICKING,
                    description: `${store.type} statüsü güncellendi: Picking`,
                    metadata: { integration: store.type, status: 'Picking' },
                });
            } catch (error) {
                this.logger.warn(`Failed to update Trendyol status to Picking: ${error.message}`);
            }
        }

        if (store.invoiceEnabled !== false) {
            try {
                const pendingInvoice = await this.invoicesService.queueInvoiceForOrder(order.id);
                this.logger.log(`Invoice queued for order ${order.orderNumber} - Invoice ID: ${pendingInvoice.id}`);

                await this.orderHistoryService.logEvent({
                    orderId: order.id,
                    action: OrderHistoryAction.NOTE_ADDED,
                    description: `Fatura kuyruğa alındı - Job tarafından kesilecek`,
                    metadata: {
                        invoiceId: pendingInvoice.id,
                        status: 'PENDING',
                    },
                });
            } catch (error) {
                this.logger.warn(`Failed to queue invoice: ${error.message}`);
            }
        }

        const label = await this.getOrCreateCargoLabel(order);
        result.cargoLabel = label;

        await this.orderHistoryService.logEvent({
            orderId: order.id,
            action: OrderHistoryAction.CARGO_LABEL_FETCHED,
            description: `Kargo etiketi alındı (${label.labelType.toUpperCase()})`,
            metadata: { labelType: label.labelType },
        });

        // Pazaryeri siparişleri paketleme sonrası PACKED statüsünde kalmalı
        // Kargoya teslim ayrı bir adım olarak yapılacak
        await this.orderRepository.update(order.id, { status: OrderStatus.PACKED });
    }

    private async processManualShipment(
        order: Order,
        result: ShipmentResult,
    ): Promise<void> {
        this.logger.log(`Processing manual shipment for order ${order.orderNumber}, documentType: ${order.documentType}`);

        const shouldCreateInvoice = order.documentType === 'INVOICE';

        if (shouldCreateInvoice) {
            try {
                const pendingInvoice = await this.invoicesService.queueInvoiceForOrder(order.id);
                this.logger.log(`Invoice queued for manual order ${order.orderNumber} - Invoice ID: ${pendingInvoice.id}`);
                result.invoiceId = pendingInvoice.id;

                await this.orderHistoryService.logEvent({
                    orderId: order.id,
                    action: OrderHistoryAction.NOTE_ADDED,
                    description: `Fatura kuyruğa alındı - Job tarafından kesilecek`,
                    metadata: {
                        invoiceId: pendingInvoice.id,
                        status: 'PENDING',
                    },
                });
            } catch (error) {
                this.logger.warn(`Failed to queue invoice for manual order: ${error.message}`);
            }
        } else {
            try {
                const waybill = await this.waybillsService.create({
                    orderId: order.id,
                    storeId: order.storeId,
                });
                result.waybillNumber = waybill.waybillNumber;
                this.logger.log(`Waybill created: ${waybill.waybillNumber}`);

                await this.orderHistoryService.logEvent({
                    orderId: order.id,
                    action: OrderHistoryAction.WAYBILL_CREATED,
                    description: `İrsaliye kesildi: ${waybill.waybillNumber}`,
                    metadata: {
                        waybillNumber: waybill.waybillNumber,
                        waybillId: waybill.id,
                    },
                });
            } catch (error) {
                this.logger.warn(`Failed to create waybill: ${error.message}`);
                result.waybillNumber = `IRS${new Date().getFullYear()}${String(Date.now()).slice(-9)}`;
            }
        }

        try {
            const credentials = order.store?.cargoUsername ? {
                customerCode: order.store.cargoCustomerCode,
                username: order.store.cargoUsername,
                password: order.store.cargoPassword,
            } : undefined;

            const arasResult = await this.arasKargoService.createShipment(order, credentials);
            
            await this.orderApiLogService.log({
                orderId: order.id,
                provider: ApiLogProvider.ARAS_KARGO,
                logType: ApiLogType.SET_ORDER,
                endpoint: arasResult._request?.endpoint,
                method: 'POST',
                requestPayload: arasResult._request,
                responsePayload: arasResult._response,
                isSuccess: arasResult.ResultCode === '0',
                errorMessage: arasResult.ResultCode !== '0' ? arasResult.ResultMsg : undefined,
                durationMs: arasResult._durationMs,
            });

            if (arasResult.ResultCode === '0') {
                this.logger.log(`Aras Kargo shipment created for order ${order.orderNumber}`);

                // IntegrationCode'u cargoTrackingNumber olarak kaydet ki getBarcode çalışsın
                const integrationCode = order.packageId || order.orderNumber;
                await this.orderRepository.update(order.id, {
                    cargoTrackingNumber: integrationCode,
                    cargoProviderName: 'Aras Kargo',
                });
                order.cargoTrackingNumber = integrationCode;

                await this.orderHistoryService.logEvent({
                    orderId: order.id,
                    action: OrderHistoryAction.CARGO_CREATED,
                    description: `Aras Kargo kaydı oluşturuldu`,
                    metadata: {
                        provider: 'Aras Kargo',
                        resultCode: arasResult.ResultCode,
                        integrationCode,
                    },
                });

                const label = await this.getOrCreateCargoLabel(order);
                result.cargoLabel = label;

                await this.orderHistoryService.logEvent({
                    orderId: order.id,
                    action: OrderHistoryAction.CARGO_LABEL_FETCHED,
                    description: `Kargo etiketi alındı (${label.labelType.toUpperCase()})`,
                    metadata: { labelType: label.labelType },
                });
            } else {
                this.logger.warn(`Aras Kargo failed: ${arasResult.ResultMsg}`);
            }
        } catch (error: any) {
            this.logger.error(`Aras Kargo error: ${error.message}`);
            
            if (error._request) {
                await this.orderApiLogService.log({
                    orderId: order.id,
                    provider: ApiLogProvider.ARAS_KARGO,
                    logType: ApiLogType.SET_ORDER,
                    endpoint: error._request?.endpoint,
                    method: 'POST',
                    requestPayload: error._request,
                    responsePayload: error._response,
                    isSuccess: false,
                    errorMessage: error.message,
                    durationMs: error._durationMs,
                });
            }
        }

        await this.orderRepository.update(order.id, { status: OrderStatus.SHIPPED });
    }

    private async updateTrendyolStatus(
        order: Order,
        store: Store,
        status: 'Picking' | 'Invoiced',
        invoiceNumber?: string,
    ): Promise<void> {
        const lines = order.items
            .filter((item) => item.lineId)
            .map((item) => ({
                lineId: Number(item.lineId),
                quantity: item.quantity,
            }));

        if (lines.length === 0) {
            throw new Error('Order has no line items with lineId');
        }

        const requestBody: any = {
            lines,
            params: {},
            status,
        };

        if (status === 'Invoiced' && invoiceNumber) {
            requestBody.params.invoiceNumber = invoiceNumber;
        }

        const url = `https://apigw.trendyol.com/integration/order/sellers/${store.sellerId}/shipment-packages/${order.packageId}`;
        const auth = Buffer.from(`${store.apiKey}:${store.apiSecret}`).toString('base64');
        const startTime = Date.now();

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const durationMs = Date.now() - startTime;
        const responseText = await response.text();
        let responseData: any;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            responseData = responseText;
        }

        await this.orderApiLogService.log({
            orderId: order.id,
            provider: ApiLogProvider.TRENDYOL,
            logType: ApiLogType.UPDATE_STATUS,
            endpoint: url,
            method: 'PUT',
            requestPayload: requestBody,
            responsePayload: responseData,
            statusCode: response.status,
            isSuccess: response.ok,
            errorMessage: !response.ok ? `HTTP ${response.status}: ${responseText}` : undefined,
            durationMs,
        });

        if (!response.ok) {
            throw new Error(`Trendyol API error: ${response.status} - ${responseText}`);
        }

        this.logger.log(`Trendyol status updated to ${status} for package ${order.packageId}`);
    }

    async getOrCreateCargoLabel(order: Order): Promise<{
        zpl?: string;
        html: string;
        labelType: 'aras' | 'dummy';
    }> {
        // Her zaman HTML etiket oluştur/al
        let html = order.cargoLabelHtml;
        if (!html) {
            html = this.generateFallbackLabelHtml(order);
            await this.orderRepository.update(order.id, { cargoLabelHtml: html });
        }

        // Aras ZPL varsa kullan, yoksa çekmeyi dene
        let zpl = order.cargoLabelZpl;
        let labelType: 'aras' | 'dummy' = 'dummy';

        if (!zpl && (order.cargoTrackingNumber || order.cargoSenderNumber)) {
            try {
                const credentials = order.store?.cargoUsername ? {
                    customerCode: order.store.cargoCustomerCode,
                    username: order.store.cargoUsername,
                    password: order.store.cargoPassword,
                } : undefined;

                const arasResult = await this.arasKargoService.getBarcode(
                    order.cargoTrackingNumber || order.cargoSenderNumber || '',
                    credentials
                );

                await this.orderApiLogService.log({
                    orderId: order.id,
                    provider: ApiLogProvider.ARAS_KARGO,
                    logType: ApiLogType.GET_BARCODE,
                    endpoint: arasResult._request?.endpoint,
                    method: 'POST',
                    requestPayload: arasResult._request,
                    responsePayload: arasResult._response,
                    isSuccess: !!arasResult.zpl,
                    errorMessage: !arasResult.zpl ? arasResult.resultMsg : undefined,
                    durationMs: arasResult._durationMs,
                });

                if (arasResult.zpl) {
                    zpl = arasResult.zpl;
                    await this.orderRepository.update(order.id, { cargoLabelZpl: zpl });
                    labelType = 'aras';
                }
            } catch (error) {
                this.logger.warn(`Failed to get ZPL from Aras: ${error.message}`);
            }
        } else if (zpl) {
            labelType = 'aras';
        }

        return { zpl, html, labelType };
    }

    private generateFallbackLabelHtml(order: Order): string {
        const shippingAddress = order.shippingAddress as any || {};
        const customerName = order.customer
            ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
            : shippingAddress.firstName
                ? `${shippingAddress.firstName} ${shippingAddress.lastName || ''}`.trim()
                : 'Müşteri';

        const address = shippingAddress.fullAddress
            || `${shippingAddress.address1 || ''} ${shippingAddress.district || ''} ${shippingAddress.city || ''}`.trim()
            || 'Adres bilgisi yok';

        const phone = shippingAddress.phone || order.customer?.phone || '';
        const senderNumber = order.cargoSenderNumber || order.packageId || order.orderNumber;

        // Store info for sender
        const store = order.store;
        const senderName = store?.senderCompanyName || store?.brandName || 'Gönderen';
        const senderAddress = store?.senderAddress || '';

        // Items list (max 5)
        const itemsList = (order.items || []).slice(0, 5).map(item =>
            `${item.sku || item.barcode || 'N/A'} x${item.quantity || 1} - ${item.productName || 'Ürün'}`
        ).join('<br>');

        return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Kargo Etiketi - ${order.orderNumber}</title>
  <style type="text/css">
    body { font-family: "Arial", sans-serif; margin: 0; padding: 0; }
    .label { width: 100mm; height: 100mm; padding: 5mm; box-sizing: border-box; border: 1px solid #000; }
    .header { text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 5mm; border-bottom: 2px solid #000; padding-bottom: 3mm; }
    .barcode-container { text-align: center; margin: 5mm 0; }
    .sender-number { font-size: 16pt; font-weight: bold; text-align: center; margin: 3mm 0; letter-spacing: 2px; }
    .recipient { margin-top: 5mm; font-size: 11pt; line-height: 1.4; }
    .recipient strong { font-size: 12pt; }
    .sender { margin-top: 3mm; font-size: 9pt; color: #333; }
    .items { margin-top: 3mm; font-size: 8pt; color: #555; border-top: 1px dashed #999; padding-top: 2mm; }
    .order-info { margin-top: 3mm; font-size: 9pt; color: #333; border-top: 1px dashed #999; padding-top: 2mm; }
    @media print { @page { size: 100mm 100mm; margin: 0; } body { margin: 0; } }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
</head>
<body>
  <div class="label">
    <div class="header">KARGO ETİKETİ</div>
    <div class="barcode-container"><svg id="barcode"></svg></div>
    <div class="sender-number">${senderNumber}</div>
    <div class="recipient">
      <strong>ALICI:</strong><br>
      ${customerName}<br>
      ${address}<br>
      ${phone ? `Tel: ${phone}` : ''}
    </div>
    <div class="sender">
      <strong>GÖNDERİCİ:</strong> ${senderName}<br>
      ${senderAddress}
    </div>
    ${itemsList ? `<div class="items"><strong>Ürünler:</strong><br>${itemsList}</div>` : ''}
    <div class="order-info">
      Sipariş No: ${order.orderNumber}<br>
      Tarih: ${new Date().toLocaleDateString('tr-TR')}
    </div>
  </div>
  <script>
    JsBarcode("#barcode", "${senderNumber}", { format: "CODE128", width: 2, height: 50, displayValue: false });
    window.onload = function() { setTimeout(function() { window.print(); }, 500); };
  </script>
</body>
</html>
        `.trim();
    }

    private async transferToPackingShelf(
        barcode: string,
        quantity: number,
        orderId: string,
        routeId: string,
    ): Promise<void> {
        try {
            const product = await this.productRepository.findOne({ where: { barcode } });

            if (!product) {
                this.logger.warn(`Product with barcode ${barcode} not found for shelf transfer`);
                return;
            }

            const order = await this.orderRepository.findOne({ where: { id: orderId } });

            const pickingShelf = await this.shelvesService.getPickingShelf();
            const packingShelf = await this.shelvesService.getPackingShelf();

            if (!pickingShelf || !packingShelf) {
                this.logger.warn(`Picking or packing shelf not found in the system`);
                return;
            }

            await this.shelvesService.transferWithHistory(
                pickingShelf.id,
                packingShelf.id,
                product.id,
                quantity,
                {
                    type: MovementType.PACKING_IN,
                    orderId,
                    routeId,
                    referenceNumber: order?.orderNumber,
                    notes: `Paketleme için transfer - Sipariş: ${order?.orderNumber || orderId}`,
                }
            );

            this.logger.log(`Transferred ${quantity} x ${barcode} from picking to packing shelf`);
        } catch (error) {
            this.logger.error(`Failed to transfer to packing shelf: ${error.message}`);
        }
    }

    private async deductFromPackingShelf(orderId: string, routeId: string): Promise<void> {
        try {
            const order = await this.orderRepository.findOne({
                where: { id: orderId },
                relations: ['items'],
            });

            if (!order) {
                this.logger.warn(`Order ${orderId} not found for packing deduction`);
                return;
            }

            const packingShelf = await this.shelvesService.getPackingShelf();

            if (!packingShelf) {
                this.logger.warn(`Packing shelf not found in the system`);
                return;
            }

            for (const item of order.items || []) {
                if (!item.barcode) continue;

                const product = await this.productRepository.findOne({ where: { barcode: item.barcode } });
                if (!product) continue;

                await this.shelvesService.removeStockWithHistory(
                    packingShelf.id,
                    product.id,
                    item.quantity || 1,
                    {
                        type: MovementType.PACKING_OUT,
                        orderId,
                        routeId,
                        referenceNumber: order.orderNumber,
                        notes: `Sipariş paketlendi ve sevk edildi - ${order.orderNumber}`,
                    }
                );
            }

            this.logger.log(`Deducted items from packing shelf for order ${order.orderNumber}`);
        } catch (error) {
            this.logger.error(`Failed to deduct from packing shelf: ${error.message}`);
        }
    }

    private async releaseStockCommitment(orderId: string): Promise<void> {
        try {
            const order = await this.orderRepository.findOne({
                where: { id: orderId },
                relations: ['items'],
            });

            if (!order || !order.storeId) {
                this.logger.warn(`Order ${orderId} not found or has no storeId for stock commitment release`);
                return;
            }

            for (const item of order.items || []) {
                let productId: string | null = null;

                if (item.barcode) {
                    const product = await this.productRepository.findOne({ where: { barcode: item.barcode } });
                    if (product) productId = product.id;
                }

                if (!productId && item.sku) {
                    const product = await this.productRepository.findOne({ where: { sku: item.sku } });
                    if (product) productId = product.id;
                }

                if (!productId) continue;

                const productStore = await this.productStoreRepository.findOne({
                    where: { productId, storeId: order.storeId }
                });

                if (productStore) {
                    const quantity = item.quantity || 1;
                    productStore.committedQuantity = Math.max(0, (productStore.committedQuantity || 0) - quantity);
                    productStore.sellableQuantity = Math.max(0,
                        (productStore.reservableQuantity || 0) - productStore.committedQuantity
                    );
                    await this.productStoreRepository.save(productStore);
                }
            }

            this.logger.log(`Released stock commitment for order ${orderId}`);
        } catch (error) {
            this.logger.error(`Failed to release stock commitment: ${error.message}`);
        }
    }
}
