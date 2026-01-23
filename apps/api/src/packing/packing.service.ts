import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
    Inject,
    forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
import { IntegrationStore } from '../integration-stores/entities/integration-store.entity';
import { Integration, IntegrationType } from '../integrations/entities/integration.entity';
import { StartPackingDto, ScanBarcodeDto, CompleteOrderDto } from './dto/packing.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { ArasKargoService } from '../integrations/aras/aras-kargo.service';
import { WaybillsService } from '../waybills/waybills.service';
import { ShelvesService } from '../shelves/shelves.service';
import { MovementType } from '../shelves/entities/shelf-stock-movement.entity';
import { Product } from '../products/entities/product.entity';
import { OrderHistoryService } from '../orders/order-history.service';
import { OrderHistoryAction } from '../orders/entities/order-history.entity';

export interface ShipmentResult {
    success: boolean;
    message: string;
    invoiceNumber?: string;
    cargoLabel?: { type: 'zpl' | 'html'; content: string };
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
        @InjectRepository(IntegrationStore)
        private readonly integrationStoreRepository: Repository<IntegrationStore>,
        @InjectRepository(Integration)
        private readonly integrationRepository: Repository<Integration>,
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @Inject(forwardRef(() => InvoicesService))
        private readonly invoicesService: InvoicesService,
        private readonly arasKargoService: ArasKargoService,
        @Inject(forwardRef(() => WaybillsService))
        private readonly waybillsService: WaybillsService,
        private readonly shelvesService: ShelvesService,
        @Inject(forwardRef(() => OrderHistoryService))
        private readonly orderHistoryService: OrderHistoryService,
    ) { }

    async startSession(dto: StartPackingDto, userId?: string): Promise<PackingSession> {
        // Validate route exists and is in READY or COLLECTING status
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

        // Check if session already exists for this route
        const existingSession = await this.sessionRepository.findOne({
            where: {
                routeId: dto.routeId,
                status: PackingSessionStatus.ACTIVE,
            },
        });

        if (existingSession) {
            // Return existing session
            return this.getSession(existingSession.id);
        }

        // Create new session
        const session = this.sessionRepository.create({
            routeId: dto.routeId,
            userId: userId || null,
            stationId: dto.stationId || null,
            status: PackingSessionStatus.ACTIVE,
            totalOrders: route.routeOrders?.length || 0,
            packedOrders: 0,
        });

        const savedSession = await this.sessionRepository.save(session);

        // Create packing items for all orders in route
        const packingItems: PackingOrderItem[] = [];
        let sequence = 0;

        for (const routeOrder of route.routeOrders || []) {
            if (routeOrder.isPacked) continue; // Skip already packed orders

            const order = routeOrder.order;
            if (!order || !order.items) continue;

            for (const item of order.items) {
                packingItems.push(this.packingItemRepository.create({
                    sessionId: savedSession.id,
                    orderId: order.id,
                    barcode: item.barcode,
                    productId: null, // Will be resolved on scan
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

        // Set first unpacked order as current
        const firstUnpackedOrder = route.routeOrders?.find(ro => !ro.isPacked);
        if (firstUnpackedOrder) {
            savedSession.currentOrderId = firstUnpackedOrder.orderId;
            await this.sessionRepository.save(savedSession);

            // Log packing started for first order
            await this.orderHistoryService.logEvent({
                orderId: firstUnpackedOrder.orderId,
                action: OrderHistoryAction.PACKING_STARTED,
                userId,
                routeId: route.id,
                routeName: route.name,
                sessionId: savedSession.id,
                description: `Paketleme başladı - Rota: ${route.name}`,
            });
        }

        return this.getSession(savedSession.id);
    }

    async getSession(id: string): Promise<PackingSession> {
        const session = await this.sessionRepository.findOne({
            where: { id },
            relations: ['route', 'items', 'items.order', 'items.order.customer'],
        });

        if (!session) {
            throw new NotFoundException('Packing session not found');
        }

        return session;
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

        // Find matching item for current order
        const currentOrderItems = session.items.filter(
            item => item.orderId === session.currentOrderId && !item.isComplete
        );

        const matchingItem = currentOrderItems.find(item => item.barcode === dto.barcode);

        if (!matchingItem) {
            // Check if barcode belongs to any order in session
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

        // Update scanned quantity
        matchingItem.scannedQuantity += 1;
        matchingItem.scannedAt = new Date();

        if (matchingItem.scannedQuantity >= matchingItem.requiredQuantity) {
            matchingItem.isComplete = true;
        }

        await this.packingItemRepository.save(matchingItem);

        // Transfer stock from picking shelf to packing shelf
        await this.transferToPackingShelf(
            dto.barcode,
            1,
            session.currentOrderId!,
            session.routeId,
        );

        // Check if current order is complete
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

        // Handle consumables if provided
        if (dto.consumables && dto.consumables.length > 0) {
            for (const consumableDto of dto.consumables) {
                const consumable = await this.consumableRepository.findOne({
                    where: { id: consumableDto.consumableId }
                });

                if (!consumable) {
                    this.logger.warn(`Consumable ${consumableDto.consumableId} not found, skipping`);
                    continue;
                }

                // Create order consumable record
                const orderConsumable = this.orderConsumableRepository.create({
                    orderId: dto.orderId,
                    consumableId: consumableDto.consumableId,
                    quantity: consumableDto.quantity,
                    unitCost: Number(consumable.averageCost) || 0,
                    packingSessionId: dto.sessionId,
                });
                await this.orderConsumableRepository.save(orderConsumable);

                // Deduct from consumable stock (don't go below 0)
                const currentStock = Number(consumable.stockQuantity) || 0;
                const deductAmount = Math.min(consumableDto.quantity, currentStock);
                if (deductAmount > 0) {
                    consumable.stockQuantity = currentStock - deductAmount;
                    await this.consumableRepository.save(consumable);
                }
            }
        }

        // TODO: Deduct stock from packing shelf - disabled for now, will be enabled with specific rules later
        // await this.deductFromPackingShelf(dto.orderId, session.routeId);

        // Mark route order as packed
        await this.routeOrderRepository.update(
            { routeId: session.routeId, orderId: dto.orderId },
            { isPacked: true, packedAt: new Date() }
        );

        // Update order status to PACKED (will be INVOICED when invoice is actually created)
        await this.orderRepository.update(dto.orderId, { status: OrderStatus.PACKED });

        // Get route info for logging
        const route = await this.routeRepository.findOne({ where: { id: session.routeId } });

        // Log packing completed for this order
        await this.orderHistoryService.logEvent({
            orderId: dto.orderId,
            action: OrderHistoryAction.PACKING_COMPLETED,
            userId: session.userId,
            routeId: session.routeId,
            routeName: route?.name,
            sessionId: dto.sessionId,
            description: `Paketleme tamamlandı - Rota: ${route?.name}`,
        });

        // Check if we should auto-process shipment for marketplace orders
        let shouldProcessShipment = dto.processShipment === true;
        
        if (!shouldProcessShipment && dto.processShipment !== false) {
            // Auto-detect: check if this is a marketplace order with status sending enabled
            const order = await this.orderRepository.findOne({
                where: { id: dto.orderId },
            });
            
            if (order?.integrationId && order?.storeId) {
                const storeConfig = await this.integrationStoreRepository.findOne({
                    where: { integrationId: order.integrationId, storeId: order.storeId },
                });
                
                if (storeConfig?.sendOrderStatus) {
                    shouldProcessShipment = true;
                    this.logger.log(`Auto-processing shipment for marketplace order ${dto.orderId} (sendOrderStatus enabled)`);
                }
            }
        }

        // Process shipment if requested or auto-detected
        let shipmentResult: ShipmentResult | undefined;
        if (shouldProcessShipment) {
            shipmentResult = await this.processOrderShipment(dto.orderId);

            // Log shipped if successful
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

        // Update session progress
        session.packedOrders += 1;

        // Find next unpacked order
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

            // Log packing started for next order
            await this.orderHistoryService.logEvent({
                orderId: nextRouteOrder.orderId,
                action: OrderHistoryAction.PACKING_STARTED,
                userId: session.userId,
                routeId: session.routeId,
                routeName: route?.name,
                sessionId: dto.sessionId,
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
            // All orders packed - complete session
            session.status = PackingSessionStatus.COMPLETED;
            session.completedAt = new Date();
            session.currentOrderId = null;
            await this.sessionRepository.save(session);

            // Update route status
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

        // Get packing items for this order
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
            relations: ['items', 'customer', 'integration', 'store'],
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const result: ShipmentResult = {
            success: false,
            message: '',
        };

        try {
            // Get integration store config if exists
            let storeConfig: IntegrationStore | null = null;
            let integrationType: IntegrationType | null = null;

            if (order.integrationId && order.storeId) {
                storeConfig = await this.integrationStoreRepository.findOne({
                    where: { integrationId: order.integrationId, storeId: order.storeId },
                });

                const integration = await this.integrationRepository.findOne({
                    where: { id: order.integrationId },
                });
                integrationType = integration?.type || null;
            }

            // Determine if this is a marketplace order or manual order
            const isMarketplaceOrder = !!integrationType;

            if (isMarketplaceOrder) {
                // MARKETPLACE ORDER FLOW (Trendyol, Hepsiburada, ikas)
                await this.processMarketplaceShipment(order, storeConfig, integrationType!, result);
            } else {
                // MANUAL ORDER FLOW
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
        storeConfig: IntegrationStore | null,
        integrationType: IntegrationType,
        result: ShipmentResult,
    ): Promise<void> {
        this.logger.log(`Processing marketplace shipment for order ${order.orderNumber} (${integrationType})`);

        const shouldSendStatus = storeConfig?.sendOrderStatus !== false;

        // 1. Update status to Picking on integration (Trendyol only for now)
        if (integrationType === IntegrationType.TRENDYOL && shouldSendStatus) {
            try {
                await this.updateTrendyolStatus(order, storeConfig!, 'Picking');

                // Log integration status update
                await this.orderHistoryService.logEvent({
                    orderId: order.id,
                    action: OrderHistoryAction.INTEGRATION_STATUS_PICKING,
                    description: `${integrationType} statüsü güncellendi: Picking`,
                    metadata: { integration: integrationType, status: 'Picking' },
                });
            } catch (error) {
                this.logger.warn(`Failed to update Trendyol status to Picking: ${error.message}`);
            }
        } else if (!shouldSendStatus) {
            this.logger.log(`Skipping status update - sendOrderStatus is disabled for store`);
        }

        // 2. Queue invoice for later processing (will be processed by job)
        if (storeConfig?.invoiceEnabled) {
            try {
                const pendingInvoice = await this.invoicesService.queueInvoiceForOrder(order.id);
                this.logger.log(`Invoice queued for order ${order.orderNumber} - Invoice ID: ${pendingInvoice.id}`);

                // Log that invoice is queued (not created yet)
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
        } else {
            this.logger.log(`Invoice queueing skipped - invoiceEnabled is ${storeConfig?.invoiceEnabled} for store ${storeConfig?.storeId || 'unknown'}`);
        }

        // 4. Get cargo label (ZPL or HTML fallback)
        const label = await this.getOrCreateCargoLabel(order);
        result.cargoLabel = label;

        // Log cargo label fetched
        await this.orderHistoryService.logEvent({
            orderId: order.id,
            action: OrderHistoryAction.CARGO_LABEL_FETCHED,
            description: `Kargo etiketi alındı (${label.type.toUpperCase()})`,
            metadata: { labelType: label.type },
        });

        // 5. Update order status to SHIPPED
        await this.orderRepository.update(order.id, { status: OrderStatus.SHIPPED });
    }

    private async processManualShipment(
        order: Order,
        result: ShipmentResult,
    ): Promise<void> {
        this.logger.log(`Processing manual shipment for order ${order.orderNumber}`);

        // 1. Create waybill (İrsaliye)
        try {
            const waybill = await this.waybillsService.create({
                orderId: order.id,
                storeId: order.storeId,
            });
            result.waybillNumber = waybill.waybillNumber;
            this.logger.log(`Waybill created: ${waybill.waybillNumber}`);

            // Log waybill created
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

        // 2. Create shipment with Aras Kargo
        try {
            const arasResult = await this.arasKargoService.createShipment(order);
            if (arasResult.ResultCode === '0') {
                this.logger.log(`Aras Kargo shipment created for order ${order.orderNumber}`);

                // Log cargo created
                await this.orderHistoryService.logEvent({
                    orderId: order.id,
                    action: OrderHistoryAction.CARGO_CREATED,
                    description: `Aras Kargo kaydı oluşturuldu`,
                    metadata: {
                        provider: 'Aras Kargo',
                        resultCode: arasResult.ResultCode,
                    },
                });

                // 3. Get ZPL label
                const label = await this.getOrCreateCargoLabel(order);
                result.cargoLabel = label;

                // Log cargo label fetched
                await this.orderHistoryService.logEvent({
                    orderId: order.id,
                    action: OrderHistoryAction.CARGO_LABEL_FETCHED,
                    description: `Kargo etiketi alındı (${label.type.toUpperCase()})`,
                    metadata: { labelType: label.type },
                });
            } else {
                this.logger.warn(`Aras Kargo failed: ${arasResult.ResultMsg}`);
            }
        } catch (error) {
            this.logger.error(`Aras Kargo error: ${error.message}`);
        }

        // 4. Update order status to SHIPPED
        await this.orderRepository.update(order.id, { status: OrderStatus.SHIPPED });
    }

    private async updateTrendyolStatus(
        order: Order,
        storeConfig: IntegrationStore,
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

        const url = `https://apigw.trendyol.com/integration/order/sellers/${storeConfig.sellerId}/shipment-packages/${order.packageId}`;
        const auth = Buffer.from(`${storeConfig.apiKey}:${storeConfig.apiSecret}`).toString('base64');

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Trendyol API error: ${response.status} - ${errorData}`);
        }

        this.logger.log(`Trendyol status updated to ${status} for package ${order.packageId}`);
    }

    async getOrCreateCargoLabel(order: Order): Promise<{ type: 'zpl' | 'html'; content: string }> {
        // If ZPL already exists, return it
        if (order.cargoLabelZpl) {
            return { type: 'zpl', content: order.cargoLabelZpl };
        }

        // Try to fetch ZPL from Aras Kargo
        if (order.cargoTrackingNumber || order.cargoSenderNumber) {
            try {
                const zpl = await this.arasKargoService.getBarcode(
                    order.cargoTrackingNumber || order.cargoSenderNumber || ''
                );

                if (zpl) {
                    await this.orderRepository.update(order.id, { cargoLabelZpl: zpl });
                    return { type: 'zpl', content: zpl };
                }
            } catch (error) {
                this.logger.warn(`Failed to get ZPL from Aras: ${error.message}`);
            }
        }

        // Fallback to HTML label
        const html = this.generateFallbackLabelHtml(order);
        await this.orderRepository.update(order.id, { cargoLabelHtml: html });
        return { type: 'html', content: html };
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

        return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Kargo Etiketi - ${order.orderNumber}</title>
  <style type="text/css">
    body {
      font-family: "Arial", sans-serif;
      margin: 0;
      padding: 0;
    }
    .label {
      width: 100mm;
      height: 100mm;
      padding: 5mm;
      box-sizing: border-box;
      border: 1px solid #000;
    }
    .header {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 5mm;
      border-bottom: 2px solid #000;
      padding-bottom: 3mm;
    }
    .barcode-container {
      text-align: center;
      margin: 5mm 0;
    }
    .sender-number {
      font-size: 16pt;
      font-weight: bold;
      text-align: center;
      margin: 3mm 0;
      letter-spacing: 2px;
    }
    .recipient {
      margin-top: 5mm;
      font-size: 11pt;
      line-height: 1.4;
    }
    .recipient strong {
      font-size: 12pt;
    }
    .order-info {
      margin-top: 5mm;
      font-size: 9pt;
      color: #333;
      border-top: 1px dashed #999;
      padding-top: 3mm;
    }
    @media print {
      @page {
        size: 100mm 100mm;
        margin: 0;
      }
      body {
        margin: 0;
      }
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
</head>
<body>
  <div class="label">
    <div class="header">KARGO ETİKETİ</div>
    <div class="barcode-container">
      <svg id="barcode"></svg>
    </div>
    <div class="sender-number">${senderNumber}</div>
    <div class="recipient">
      <strong>ALICI:</strong><br>
      ${customerName}<br>
      ${address}<br>
      ${phone ? `Tel: ${phone}` : ''}
    </div>
    <div class="order-info">
      Sipariş No: ${order.orderNumber}<br>
      Tarih: ${new Date().toLocaleDateString('tr-TR')}
    </div>
  </div>
  <script>
    JsBarcode("#barcode", "${senderNumber}", {
      format: "CODE128",
      width: 2,
      height: 50,
      displayValue: false
    });
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
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
            const product = await this.productRepository.findOne({
                where: { barcode },
            });

            if (!product) {
                this.logger.warn(`Product with barcode ${barcode} not found for shelf transfer`);
                return;
            }

            const order = await this.orderRepository.findOne({
                where: { id: orderId },
            });

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

                const product = await this.productRepository.findOne({
                    where: { barcode: item.barcode },
                });

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
}
