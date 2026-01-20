import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Shelf } from '../../shelves/entities/shelf.entity';
import { Consumable } from '../../consumables/entities/consumable.entity';

@Entity('shelf_consumable_stocks')
@Unique(['shelfId', 'consumableId'])
export class ShelfConsumableStock extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'shelf_id' })
    shelfId: string;

    @ManyToOne(() => Shelf, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shelf_id' })
    shelf: Shelf;

    @Column({ name: 'consumable_id' })
    consumableId: string;

    @ManyToOne(() => Consumable, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'consumable_id' })
    consumable: Consumable;

    // Available quantity on this shelf
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    quantity: number;

    // Reserved quantity (for orders being picked or internal usage)
    @Column({ name: 'reserved_quantity', type: 'decimal', precision: 10, scale: 2, default: 0 })
    reservedQuantity: number;

    // Calculated available = quantity - reservedQuantity
    get availableQuantity(): number {
        return Number(this.quantity) - Number(this.reservedQuantity);
    }
}
