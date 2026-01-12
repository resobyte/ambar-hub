import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('purchase_order_items')
export class PurchaseOrderItem extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'purchase_order_id' })
    purchaseOrderId: string;

    @ManyToOne(() => PurchaseOrder, (po) => po.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'purchase_order_id' })
    purchaseOrder: PurchaseOrder;

    @Column({ name: 'product_id' })
    productId: string;

    @ManyToOne(() => Product, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ name: 'ordered_quantity', type: 'int' })
    orderedQuantity: number;

    @Column({ name: 'received_quantity', type: 'int', default: 0 })
    receivedQuantity: number;

    @Column('decimal', { name: 'unit_price', precision: 10, scale: 2 })
    unitPrice: number;

    // Calculated remaining = orderedQuantity - receivedQuantity
    get remainingQuantity(): number {
        return this.orderedQuantity - this.receivedQuantity;
    }
}
