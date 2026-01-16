import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
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
import { OrderStatus } from '../orders/enums/order-status.enum';
import { StartPackingDto, ScanBarcodeDto, CompleteOrderDto } from './dto/packing.dto';

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
    }> {
        const session = await this.sessionRepository.findOne({
            where: { id: dto.sessionId },
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        // Mark route order as packed
        await this.routeOrderRepository.update(
            { routeId: session.routeId, orderId: dto.orderId },
            { isPacked: true, packedAt: new Date() }
        );

        // Update order status to INVOICED (ready for shipping)
        await this.orderRepository.update(dto.orderId, { status: OrderStatus.INVOICED });

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

            return {
                success: true,
                message: 'Sipariş paketlendi. Sonraki siparişe geçiliyor.',
                sessionComplete: false,
                nextOrderId: nextRouteOrder.orderId,
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
}
