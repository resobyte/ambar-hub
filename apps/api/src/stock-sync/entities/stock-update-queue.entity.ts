import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Store } from '../../stores/entities/store.entity';
import { StockUpdateReason } from '../enums/stock-sync.enum';

@Entity('stock_update_queue')
@Index('IDX_stock_queue_pending', ['processedAt', 'createdAt'])
@Index('IDX_stock_queue_store', ['storeId'])
@Index('IDX_stock_queue_product', ['productId'])
export class StockUpdateQueue extends BaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'product_id', type: 'uuid' })
    productId: string;

    @ManyToOne(() => Product, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ name: 'store_id', type: 'uuid' })
    storeId: string;

    @ManyToOne(() => Store, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'store_id' })
    store: Store;

    @Column({
        type: 'enum',
        enum: StockUpdateReason,
    })
    reason: StockUpdateReason;

    @Column({ type: 'int', default: 50 })
    priority: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @Column({ name: 'processed_at', type: 'timestamp', nullable: true })
    processedAt: Date | null;
}
