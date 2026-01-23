import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Order } from './order.entity';
import { Consumable } from '../../consumables/entities/consumable.entity';

@Entity('order_consumables')
export class OrderConsumable extends BaseEntity {
    @Column({ name: 'order_id' })
    orderId: string;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ name: 'consumable_id' })
    consumableId: string;

    @ManyToOne(() => Consumable)
    @JoinColumn({ name: 'consumable_id' })
    consumable: Consumable;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_cost', default: 0 })
    unitCost: number;

    @Column({ name: 'packing_session_id', type: 'varchar', length: 36, nullable: true })
    packingSessionId: string | null;
}
