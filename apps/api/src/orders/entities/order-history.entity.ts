import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Order } from './order.entity';
import { User } from '../../users/entities/user.entity';

export enum OrderHistoryAction {
    CREATED = 'CREATED',
    ROUTE_ASSIGNED = 'ROUTE_ASSIGNED',
    PICKING_STARTED = 'PICKING_STARTED',
    PICKING_COMPLETED = 'PICKING_COMPLETED',
    PACKING_STARTED = 'PACKING_STARTED',
    PACKING_COMPLETED = 'PACKING_COMPLETED',
    INVOICE_CREATED = 'INVOICE_CREATED',
    INTEGRATION_STATUS_PICKING = 'INTEGRATION_STATUS_PICKING',
    INTEGRATION_STATUS_INVOICED = 'INTEGRATION_STATUS_INVOICED',
    WAYBILL_CREATED = 'WAYBILL_CREATED',
    CARGO_CREATED = 'CARGO_CREATED',
    CARGO_LABEL_FETCHED = 'CARGO_LABEL_FETCHED',
    INVOICED = 'INVOICED',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
    RETURNED = 'RETURNED',
    STATUS_CHANGED = 'STATUS_CHANGED',
    NOTE_ADDED = 'NOTE_ADDED',
}

@Entity('order_histories')
export class OrderHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'order_id', type: 'char', length: 36 })
    orderId: string;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({
        type: 'enum',
        enum: OrderHistoryAction,
    })
    action: OrderHistoryAction;

    @Column({ name: 'previous_status', type: 'varchar', length: 50, nullable: true })
    previousStatus: string | null;

    @Column({ name: 'new_status', type: 'varchar', length: 50, nullable: true })
    newStatus: string | null;

    @Column({ name: 'user_id', type: 'char', length: 36, nullable: true })
    userId: string | null;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_name', type: 'varchar', length: 255, nullable: true })
    userName: string | null;

    @Column({ name: 'route_id', type: 'char', length: 36, nullable: true })
    routeId: string | null;

    @Column({ name: 'route_name', type: 'varchar', length: 255, nullable: true })
    routeName: string | null;

    @Column({ name: 'session_id', type: 'char', length: 36, nullable: true })
    sessionId: string | null;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column('simple-json', { nullable: true })
    metadata: Record<string, any> | null;

    @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
    ipAddress: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
