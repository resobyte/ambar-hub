import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Route } from './route.entity';
import { Consumable } from '../../consumables/entities/consumable.entity';

@Entity('route_consumables')
export class RouteConsumable extends BaseEntity {
    @Column({ name: 'route_id' })
    routeId: string;

    @ManyToOne(() => Route, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'route_id' })
    route: Route;

    @Column({ name: 'consumable_id' })
    consumableId: string;

    @ManyToOne(() => Consumable)
    @JoinColumn({ name: 'consumable_id' })
    consumable: Consumable;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_cost', default: 0 })
    unitCost: number;
}
