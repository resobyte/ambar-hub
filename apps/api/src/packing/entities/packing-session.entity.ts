import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Route } from '../../routes/entities/route.entity';
import { User } from '../../users/entities/user.entity';
import { PackingSessionStatus } from '../enums/packing-session-status.enum';
import { PackingOrderItem } from './packing-order-item.entity';

@Entity('packing_sessions')
export class PackingSession extends BaseEntity {
    @Column({ name: 'route_id', type: 'uuid' })
    routeId: string;

    @ManyToOne(() => Route, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'route_id' })
    route: Route;

    @Column({ name: 'user_id', type: 'uuid', nullable: true })
    userId: string | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({
        type: 'enum',
        enum: PackingSessionStatus,
        default: PackingSessionStatus.ACTIVE
    })
    status: PackingSessionStatus;

    @Column({ name: 'current_order_id', type: 'uuid', nullable: true })
    currentOrderId: string | null;

    @Column({ name: 'station_id', type: 'varchar', length: 50, nullable: true })
    stationId: string | null;

    @Column({ name: 'started_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    startedAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date | null;

    @Column({ name: 'total_orders', type: 'int', default: 0 })
    totalOrders: number;

    @Column({ name: 'packed_orders', type: 'int', default: 0 })
    packedOrders: number;

    @OneToMany(() => PackingOrderItem, (item) => item.session)
    items: PackingOrderItem[];
}
