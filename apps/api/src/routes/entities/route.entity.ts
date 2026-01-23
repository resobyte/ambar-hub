import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';
import { RouteOrder } from './route-order.entity';
import { RouteConsumable } from './route-consumable.entity';
import { RouteStatus } from '../enums/route-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('routes')
export class Route extends BaseEntity {
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.COLLECTING })
    status: RouteStatus;

    @OneToMany(() => RouteOrder, (routeOrder) => routeOrder.route, { cascade: true })
    routeOrders: RouteOrder[];

    @OneToMany(() => RouteConsumable, (rc) => rc.route, { cascade: true })
    routeConsumables: RouteConsumable[];

    get orders(): Order[] {
        return this.routeOrders?.map(ro => ro.order).filter(Boolean) || [];
    }

    @Column({ name: 'label_printed_at', type: 'timestamp', nullable: true })
    labelPrintedAt: Date | null;

    @Column({ name: 'total_order_count', type: 'int', default: 0 })
    totalOrderCount: number;

    @Column({ name: 'total_item_count', type: 'int', default: 0 })
    totalItemCount: number;

    @Column({ name: 'unique_product_count', type: 'int', default: 0 })
    uniqueProductCount: number;

    @Column({ name: 'picked_item_count', type: 'int', default: 0 })
    pickedItemCount: number;

    @Column({ name: 'packed_order_count', type: 'int', default: 0 })
    packedOrderCount: number;

    @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
    assignedUserId: string | null;

    @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
    createdById: string | null;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by_id' })
    createdBy: User;

    @Column({ name: 'order_start_date', type: 'timestamp', nullable: true })
    orderStartDate: Date | null;

    @Column({ name: 'order_end_date', type: 'timestamp', nullable: true })
    orderEndDate: Date | null;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;
}
