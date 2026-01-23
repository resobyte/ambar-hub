import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderHistory, OrderHistoryAction } from './entities/order-history.entity';
import { User } from '../users/entities/user.entity';

export interface LogOrderEventParams {
    orderId: string;
    action: OrderHistoryAction;
    userId?: string | null;
    userName?: string | null;
    previousStatus?: string | null;
    newStatus?: string | null;
    routeId?: string | null;
    routeName?: string | null;
    sessionId?: string | null;
    description?: string | null;
    metadata?: Record<string, any> | null;
    ipAddress?: string | null;
}

@Injectable()
export class OrderHistoryService {
    private readonly logger = new Logger(OrderHistoryService.name);

    constructor(
        @InjectRepository(OrderHistory)
        private readonly historyRepository: Repository<OrderHistory>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async logEvent(params: LogOrderEventParams): Promise<OrderHistory> {
        let userName = params.userName;

        if (params.userId && !userName) {
            const user = await this.userRepository.findOne({
                where: { id: params.userId },
            });
            userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : undefined;
        }

        const history = new OrderHistory();
        history.orderId = params.orderId;
        history.action = params.action;
        history.userId = params.userId || null;
        history.userName = userName || null;
        history.previousStatus = params.previousStatus || null;
        history.newStatus = params.newStatus || null;
        history.routeId = params.routeId || null;
        history.routeName = params.routeName || null;
        history.sessionId = params.sessionId || null;
        history.description = params.description || null;
        history.metadata = params.metadata || null;
        history.ipAddress = params.ipAddress || null;

        const saved = await this.historyRepository.save(history);
        this.logger.log(`Order ${params.orderId}: ${params.action} by ${userName || 'System'}`);

        return saved;
    }

    async getOrderHistory(orderId: string): Promise<OrderHistory[]> {
        return this.historyRepository.find({
            where: { orderId },
            relations: ['user'],
            order: { createdAt: 'ASC' },
        });
    }

    async getOrderHistoryTimeline(orderId: string): Promise<{
        createdAt?: Date;
        createdBy?: string;
        routeAssignedAt?: Date;
        routeAssignedBy?: string;
        routeName?: string;
        pickingStartedAt?: Date;
        pickingStartedBy?: string;
        pickingCompletedAt?: Date;
        pickingCompletedBy?: string;
        packingStartedAt?: Date;
        packingStartedBy?: string;
        packingCompletedAt?: Date;
        packingCompletedBy?: string;
        shippedAt?: Date;
        shippedBy?: string;
        deliveredAt?: Date;
        cancelledAt?: Date;
        cancelledBy?: string;
        history: OrderHistory[];
    }> {
        const history = await this.getOrderHistory(orderId);

        const timeline: any = { history };

        for (const event of history) {
            switch (event.action) {
                case OrderHistoryAction.CREATED:
                    if (!timeline.createdAt) {
                        timeline.createdAt = event.createdAt;
                        timeline.createdBy = event.userName;
                    }
                    break;
                case OrderHistoryAction.ROUTE_ASSIGNED:
                    if (!timeline.routeAssignedAt) {
                        timeline.routeAssignedAt = event.createdAt;
                        timeline.routeAssignedBy = event.userName;
                        timeline.routeName = event.routeName;
                    }
                    break;
                case OrderHistoryAction.PICKING_STARTED:
                    if (!timeline.pickingStartedAt) {
                        timeline.pickingStartedAt = event.createdAt;
                        timeline.pickingStartedBy = event.userName;
                    }
                    break;
                case OrderHistoryAction.PICKING_COMPLETED:
                    if (!timeline.pickingCompletedAt) {
                        timeline.pickingCompletedAt = event.createdAt;
                        timeline.pickingCompletedBy = event.userName;
                    }
                    break;
                case OrderHistoryAction.PACKING_STARTED:
                    if (!timeline.packingStartedAt) {
                        timeline.packingStartedAt = event.createdAt;
                        timeline.packingStartedBy = event.userName;
                    }
                    break;
                case OrderHistoryAction.PACKING_COMPLETED:
                    if (!timeline.packingCompletedAt) {
                        timeline.packingCompletedAt = event.createdAt;
                        timeline.packingCompletedBy = event.userName;
                    }
                    break;
                case OrderHistoryAction.SHIPPED:
                    if (!timeline.shippedAt) {
                        timeline.shippedAt = event.createdAt;
                        timeline.shippedBy = event.userName;
                    }
                    break;
                case OrderHistoryAction.DELIVERED:
                    if (!timeline.deliveredAt) {
                        timeline.deliveredAt = event.createdAt;
                    }
                    break;
                case OrderHistoryAction.CANCELLED:
                    if (!timeline.cancelledAt) {
                        timeline.cancelledAt = event.createdAt;
                        timeline.cancelledBy = event.userName;
                    }
                    break;
            }
        }

        return timeline;
    }

    async getUserActivitySummary(userId: string, startDate?: string, endDate?: string): Promise<{
        totalRouted: number;
        totalPicked: number;
        totalPacked: number;
    }> {
        const query = this.historyRepository.createQueryBuilder('h')
            .where('h.userId = :userId', { userId });

        if (startDate) {
            query.andWhere('h.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
            query.andWhere('h.createdAt <= :endDate', { endDate });
        }

        const routedCount = await query.clone()
            .andWhere('h.action = :action', { action: OrderHistoryAction.ROUTE_ASSIGNED })
            .getCount();

        const pickedCount = await query.clone()
            .andWhere('h.action = :action', { action: OrderHistoryAction.PICKING_COMPLETED })
            .getCount();

        const packedCount = await query.clone()
            .andWhere('h.action = :action', { action: OrderHistoryAction.PACKING_COMPLETED })
            .getCount();

        return {
            totalRouted: routedCount,
            totalPicked: pickedCount,
            totalPacked: packedCount,
        };
    }
}
