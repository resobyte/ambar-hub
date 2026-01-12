import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Shelf } from './shelf.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('shelf_stocks')
@Unique(['shelfId', 'productId'])
export class ShelfStock extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'shelf_id' })
    shelfId: string;

    @ManyToOne(() => Shelf, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shelf_id' })
    shelf: Shelf;

    @Column({ name: 'product_id' })
    productId: string;

    @ManyToOne(() => Product, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    // Available quantity on this shelf
    @Column({ type: 'int', default: 0 })
    quantity: number;

    // Reserved quantity (for orders being picked)
    @Column({ name: 'reserved_quantity', type: 'int', default: 0 })
    reservedQuantity: number;

    // Calculated available = quantity - reservedQuantity
    get availableQuantity(): number {
        return this.quantity - this.reservedQuantity;
    }
}
