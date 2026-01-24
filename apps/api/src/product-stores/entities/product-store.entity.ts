import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Store } from '../../stores/entities/store.entity';

@Entity('product_stores')
@Unique(['productId', 'storeId'])
export class ProductStore extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column({ name: 'store_id', type: 'uuid' })
  storeId!: string;

  @Column({ name: 'store_sku', type: 'varchar', length: 255, nullable: true })
  storeSku!: string | null;

  @Column({ name: 'store_barcode', type: 'varchar', length: 255, nullable: true })
  storeBarcode!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'store_sale_price', nullable: true })
  storeSalePrice!: number | null;

  @Column({ type: 'int', name: 'stock_quantity', default: 0 })
  stockQuantity!: number;

  @Column({ type: 'int', name: 'sellable_quantity', default: 0 })
  sellableQuantity!: number;

  @Column({ type: 'int', name: 'reservable_quantity', default: 0 })
  reservableQuantity!: number;

  @Column({ type: 'int', name: 'committed_quantity', default: 0 })
  committedQuantity!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ManyToOne(() => Product, (product) => product.productStores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => Store, (store) => store.productStores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'store_id' })
  store!: Store;
}
