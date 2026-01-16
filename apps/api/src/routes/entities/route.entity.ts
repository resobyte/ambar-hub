import { Entity, Column, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from '../../orders/entities/order.entity';
import { RouteOrder } from './route-order.entity';
import { RouteStatus } from '../enums/route-status.enum';

@Entity('routes')
export class Route extends BaseEntity {
    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.COLLECTING })
    status: RouteStatus;

    @ManyToMany(() => Order)
    @JoinTable({
        name: 'route_orders',
        joinColumn: { name: 'route_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'order_id', referencedColumnName: 'id' },
    })
    orders: Order[];

    @OneToMany(() => RouteOrder, (routeOrder) => routeOrder.route)
    routeOrders: RouteOrder[];

    @Column({ name: 'label_printed_at', type: 'timestamp', nullable: true })
    labelPrintedAt: Date | null;

    @Column({ name: 'total_order_count', type: 'int', default: 0 })
    totalOrderCount: number;

    @Column({ name: 'total_item_count', type: 'int', default: 0 })
    totalItemCount: number;

    @Column({ name: 'picked_item_count', type: 'int', default: 0 })
    pickedItemCount: number;

    @Column({ name: 'packed_order_count', type: 'int', default: 0 })
    packedOrderCount: number;

    @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
    assignedUserId: string | null;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;
}
