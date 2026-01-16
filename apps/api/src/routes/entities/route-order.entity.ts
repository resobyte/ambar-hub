import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Column } from 'typeorm';
import { Route } from './route.entity';
import { Order } from '../../orders/entities/order.entity';

@Entity('route_orders')
export class RouteOrder {
    @PrimaryColumn({ name: 'route_id', type: 'uuid' })
    routeId: string;

    @PrimaryColumn({ name: 'order_id', type: 'uuid' })
    orderId: string;

    @ManyToOne(() => Route, (route) => route.routeOrders, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'route_id' })
    route: Route;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ name: 'sequence', type: 'int', default: 0 })
    sequence: number;

    @Column({ name: 'is_picked', default: false })
    isPicked: boolean;

    @Column({ name: 'is_packed', default: false })
    isPacked: boolean;

    @Column({ name: 'picked_at', type: 'timestamp', nullable: true })
    pickedAt: Date | null;

    @Column({ name: 'packed_at', type: 'timestamp', nullable: true })
    packedAt: Date | null;
}
