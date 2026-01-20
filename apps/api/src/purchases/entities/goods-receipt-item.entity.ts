import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { GoodsReceipt } from './goods-receipt.entity';
import { Product } from '../../products/entities/product.entity';
import { Shelf } from '../../shelves/entities/shelf.entity';
import { Consumable } from '../../consumables/entities/consumable.entity';

@Entity('goods_receipt_items')
export class GoodsReceiptItem extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'goods_receipt_id' })
    goodsReceiptId: string;

    @ManyToOne(() => GoodsReceipt, (gr) => gr.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'goods_receipt_id' })
    goodsReceipt: GoodsReceipt;

    @Column({ name: 'product_id', nullable: true })
    productId: string | null;

    @ManyToOne(() => Product, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ name: 'consumable_id', nullable: true })
    consumableId: string | null;

    @ManyToOne(() => Consumable, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'consumable_id' })
    consumable: Consumable;

    @Column({ name: 'shelf_id', nullable: true })
    shelfId: string | null;

    @ManyToOne(() => Shelf, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'shelf_id' })
    shelf: Shelf;

    @Column({ type: 'int' })
    quantity: number;

    @Column('decimal', { name: 'unit_cost', precision: 10, scale: 2 })
    unitCost: number;
}
