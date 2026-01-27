import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Product } from './product.entity';

/**
 * Represents a component product within a SET product.
 * A SET product contains multiple ProductSetItems, each pointing to a component product.
 */
@Entity('product_set_items')
export class ProductSetItem extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // The SET product that contains this component
    @Column({ name: 'set_product_id' })
    setProductId: string;

    @ManyToOne(() => Product, (p) => p.setItems, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'set_product_id' })
    setProduct: Product;

    // The component product
    @Column({ name: 'component_product_id' })
    componentProductId: string;

    @ManyToOne(() => Product, (p) => p.componentOfSets, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'component_product_id' })
    componentProduct: Product;

    // Quantity of this component in the set (usually 1)
    @Column({ type: 'int', default: 1 })
    quantity: number;

    // Price share for this component (for invoicing)
    // Total of all priceShare values should equal the SET's setPrice
    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_share', default: 0 })
    priceShare: number;

    // Order in which to display/process
    @Column({ name: 'sort_order', default: 0 })
    sortOrder: number;
}
